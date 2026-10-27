import { describe, expect, it, vi } from 'vitest';

import { NetworkError } from '@/domain/card-state';
import { PsnAuthError } from '@/domain/psn';

import { createAccessToken } from './psn-token';

const BASIC = 'Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=';
const URL = 'https://ca.account.sony.com/api/authz/v3/oauth/token';

const memoryStore = (initial: Record<string, unknown> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    get: <T>(key: string) => (data.has(key) ? (data.get(key) as T) : null),
    set: vi.fn(<T>(key: string, value: T) => void data.set(key, value)),
    remove: vi.fn((key: string) => void data.delete(key)),
  };
};

const tokenResponse = (over: Record<string, unknown> = {}) =>
  Response.json({ access_token: 'fake-at', expires_in: 3600, ...over });

describe('createAccessToken', () => {
  it('troca o refresh token por access token com o contrato da Sony', async () => {
    const fetchFn = vi.fn().mockResolvedValue(tokenResponse());
    const { get } = createAccessToken({
      fetchFn,
      store: memoryStore(),
      bundled: 'fake-rt',
      now: () => 0,
    });
    expect(await get()).toBe('fake-at');
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(URL);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: BASIC,
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    const body = new URLSearchParams(init.body as string);
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('fake-rt');
    expect(body.get('token_format')).toBe('jwt');
    expect(body.get('scope')).toBe('psn:mobile.v2.core psn:clientapp');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('reaproveita o access token até perto de expirar', async () => {
    let clock = 0;
    const fetchFn = vi.fn().mockImplementation(async () => tokenResponse());
    const { get } = createAccessToken({
      fetchFn,
      store: memoryStore(),
      bundled: 'fake-rt',
      now: () => clock,
    });
    await get();
    clock = 54 * 60_000;
    await get();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    clock = 56 * 60_000;
    await get();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('prefere o refresh token guardado e guarda o novo', async () => {
    const store = memoryStore({ 'psn.refreshToken': 'fake-stored' });
    const fetchFn = vi.fn().mockResolvedValue(tokenResponse({ refresh_token: 'fake-new' }));
    await createAccessToken({ fetchFn, store, bundled: 'fake-rt', now: () => 0 }).get();
    const body = new URLSearchParams(
      (fetchFn.mock.calls[0] as [string, RequestInit])[1].body as string,
    );
    expect(body.get('refresh_token')).toBe('fake-stored');
    expect(store.set).toHaveBeenCalledWith('psn.refreshToken', 'fake-new');
  });

  it('volta ao token do pacote quando o guardado é recusado', async () => {
    const store = memoryStore({ 'psn.refreshToken': 'fake-stored' });
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 400 }))
      .mockResolvedValueOnce(tokenResponse());
    const { get } = createAccessToken({ fetchFn, store, bundled: 'fake-rt', now: () => 0 });
    expect(await get()).toBe('fake-at');
    const body = new URLSearchParams(
      (fetchFn.mock.calls[1] as [string, RequestInit])[1].body as string,
    );
    expect(body.get('refresh_token')).toBe('fake-rt');
  });

  it.each([400, 401])('%i vira PsnAuthError', async (status) => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status }));
    const { get } = createAccessToken({
      fetchFn,
      store: memoryStore(),
      bundled: 'fake-rt',
      now: () => 0,
    });
    await expect(get()).rejects.toBeInstanceOf(PsnAuthError);
  });

  it('outro status falha sem ser PsnAuthError', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    const { get } = createAccessToken({
      fetchFn,
      store: memoryStore(),
      bundled: 'fake-rt',
      now: () => 0,
    });
    const error = await get().catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(PsnAuthError);
    expect(error).toBeInstanceOf(Error);
  });

  it('descarta o token guardado recusado antes de usar o do pacote', async () => {
    const store = memoryStore({ 'psn.refreshToken': 'fake-stored' });
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 400 }))
      .mockResolvedValueOnce(tokenResponse());
    await createAccessToken({ fetchFn, store, bundled: 'fake-rt', now: () => 0 }).get();
    expect(store.remove).toHaveBeenCalledWith('psn.refreshToken');
  });

  it('invalidate força novo access token', async () => {
    const fetchFn = vi.fn().mockImplementation(async () => tokenResponse());
    const { get, invalidate } = createAccessToken({
      fetchFn,
      store: memoryStore(),
      bundled: 'fake-rt',
      now: () => 0,
    });
    await get();
    invalidate();
    await get();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('timeout cobre a leitura do corpo', async () => {
    vi.useFakeTimers();
    try {
      const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
        const body = new Promise<unknown>((_res, rej) =>
          init?.signal?.addEventListener('abort', () => rej(new DOMException('a', 'AbortError'))),
        );
        return { ok: true, status: 200, json: () => body } as unknown as Response;
      });
      const { get } = createAccessToken({
        fetchFn,
        store: memoryStore(),
        bundled: 'fake-rt',
        now: () => 0,
      });
      const result = get().catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(8001);
      expect(await result).toBeInstanceOf(NetworkError);
    } finally {
      vi.useRealTimers();
    }
  });

  it('limpa o timer após sucesso', async () => {
    vi.useFakeTimers();
    try {
      const fetchFn = vi.fn().mockResolvedValue(tokenResponse());
      await createAccessToken({
        fetchFn,
        store: memoryStore(),
        bundled: 'fake-rt',
        now: () => 0,
      }).get();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
