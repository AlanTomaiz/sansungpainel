import { describe, expect, it, vi } from 'vitest';

import { refreshCard } from '@/application/refresh-card';

import { createPsnSource } from './psn';

const API = 'https://m.np.playstation.com/api/trophy/v1';
const TOKEN_URL = 'https://ca.account.sony.com/api/authz/v3/oauth/token';
const store = { get: () => null, set: vi.fn(), remove: vi.fn() };

const emptyCounts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };

function sony(tokenStatus = 200) {
  return vi.fn(async (url: string) => {
    if (url === TOKEN_URL)
      return tokenStatus === 200
        ? Response.json({ access_token: 'fake-at', expires_in: 3600 })
        : new Response('', { status: tokenStatus });
    if (url.endsWith('trophySummary'))
      return Response.json({ trophyLevel: 7, earnedTrophies: emptyCounts });
    return Response.json({ trophyTitles: [] });
  });
}

const make = (fetchFn: ReturnType<typeof sony>, refreshToken: string | null = 'fake-rt') =>
  createPsnSource({ fetchFn, store, refreshToken, now: () => 0 });

describe('createPsnSource', () => {
  it('monta o resumo direto na Sony', async () => {
    const fetchFn = sony();
    expect(await make(fetchFn).fetch()).toEqual({
      level: 7,
      counts: emptyCounts,
      last: null,
      progress: null,
      deals: [],
    });
    expect(fetchFn).toHaveBeenCalledWith(`${API}/users/me/trophySummary`, expect.anything());
  });

  it('sem refresh token pede para configurar o token', async () => {
    const fetchFn = sony();
    expect(await refreshCard(make(fetchFn, null), store, () => 0)).toEqual({
      status: 'unavailable',
      reason: 'Configure o token da PSN (npm run token)',
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([400, 401])('refresh token recusado (%i) mostra token expirado', async (status) => {
    expect(await refreshCard(make(sony(status)), store, () => 0)).toEqual({
      status: 'unavailable',
      reason: 'Token da PSN expirou; rode npm run token',
    });
  });

  it('falha de rede vira sem conexão', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await refreshCard(make(fetchFn), store, () => 0)).toEqual({
      status: 'unavailable',
      reason: 'Sem conexão',
    });
  });

  it('erro HTTP da Sony vira fonte indisponível', async () => {
    expect(await refreshCard(make(sony(503)), store, () => 0)).toEqual({
      status: 'unavailable',
      reason: 'Fonte indisponível',
    });
  });

  it('401 da API com access token em cache renova e tenta de novo', async () => {
    let apiCalls = 0;
    const fetchFn = vi.fn(async (url: string) => {
      if (url === TOKEN_URL) return Response.json({ access_token: 'fake-at', expires_in: 3600 });
      if (url.endsWith('trophySummary')) {
        if (apiCalls++ === 0) return new Response('', { status: 401 });
        return Response.json({ trophyLevel: 7, earnedTrophies: emptyCounts });
      }
      return Response.json({ trophyTitles: [] });
    });
    const state = await refreshCard(make(fetchFn), store, () => 0);
    expect(state.status).toBe('ok');
    expect(fetchFn.mock.calls.filter(([u]) => u === TOKEN_URL)).toHaveLength(2);
  });

  it('401 persistente da API não vira token expirado', async () => {
    const fetchFn = vi.fn(async (url: string) =>
      url === TOKEN_URL
        ? Response.json({ access_token: 'fake-at', expires_in: 3600 })
        : new Response('', { status: 401 }),
    );
    expect(await refreshCard(make(fetchFn), store, () => 0)).toEqual({
      status: 'unavailable',
      reason: 'Fonte indisponível',
    });
  });

  it('corpo parado vira sem conexão após o timeout', async () => {
    vi.useFakeTimers();
    try {
      const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
        const never = new Promise<Response>((_res, rej) =>
          init?.signal?.addEventListener('abort', () => rej(new DOMException('a', 'AbortError'))),
        );
        return never;
      });
      const pending = refreshCard(make(fetchFn), store, () => 0);
      await vi.advanceTimersByTimeAsync(8001);
      expect(await pending).toEqual({ status: 'unavailable', reason: 'Sem conexão' });
    } finally {
      vi.useRealTimers();
    }
  });
});
