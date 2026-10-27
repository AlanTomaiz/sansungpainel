import { afterEach, describe, expect, it, vi } from 'vitest';

import { NetworkError, RelayUnreachableError } from '@/domain/card-state';

import { FetchHttpClient } from './http-client';

afterEach(() => vi.useRealTimers());

const ok = (body: string): Response => new Response(body, { status: 200 });

describe('FetchHttpClient', () => {
  it('direct chama a url original', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok('x'));
    expect(await new FetchHttpClient(null, fetchFn).getText('https://a/b', 'direct')).toBe('x');
    expect(fetchFn.mock.calls[0]?.[0]).toBe('https://a/b');
  });

  it('relay monta a url do proxy', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok('x'));
    await new FetchHttpClient('http://pc:8787', fetchFn).getText('https://a/b?c=1', 'relay');
    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      `http://pc:8787/proxy?url=${encodeURIComponent('https://a/b?c=1')}`,
    );
  });

  it('relay inacessível lança RelayUnreachableError', async () => {
    const fetchFn = vi.fn(() => Promise.reject(new TypeError('net')));
    await expect(
      new FetchHttpClient('http://pc:8787', fetchFn).getText('https://a', 'relay'),
    ).rejects.toBeInstanceOf(RelayUnreachableError);
  });

  it('aborta em 8 s', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(
      (_u: string, init?: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init?.signal?.addEventListener('abort', () => rej(new Error('aborted')));
        }),
    );
    const p = new FetchHttpClient(null, fetchFn).getText('https://a', 'direct');
    const assertion = expect(p).rejects.toBeInstanceOf(NetworkError);
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
  });

  it('HTTP não-ok falha', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 500 }));
    await expect(
      new FetchHttpClient(null, fetchFn).getText('https://a', 'direct'),
    ).rejects.toThrow();
  });

  it('relay no ar com HTTP 502 passa como erro comum', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 502 }));
    const p = new FetchHttpClient('http://pc:8787', fetchFn).getText('https://a', 'relay');
    await expect(p).rejects.toThrow('HTTP 502');
    await expect(p).rejects.not.toBeInstanceOf(RelayUnreachableError);
  });

  it('falha de rede direta vira NetworkError', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('net'));
    await expect(
      new FetchHttpClient(null, fetchFn).getText('https://a', 'direct'),
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it('head usa cache no-store', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    await new FetchHttpClient(null, fetchFn).head('https://a');
    expect(fetchFn.mock.calls[0]?.[1]).toMatchObject({ method: 'HEAD', cache: 'no-store' });
  });
});
