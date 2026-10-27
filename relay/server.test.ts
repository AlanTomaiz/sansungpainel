import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRelay } from './server.ts';

let server: ReturnType<typeof createRelay>;

async function start(
  fetchFn: (u: string, init?: RequestInit) => Promise<Response>,
): Promise<string> {
  server = createRelay(fetchFn);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(() => new Promise<void>((r) => server.close(() => r())));

describe('relay', () => {
  it('answers /health with CORS', async () => {
    const base = await start(vi.fn());
    const res = await fetch(`${base}/health`);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('proxies allowlisted urls passing status and body', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response('teapot', { status: 418 }));
    const base = await start(upstream);
    const target = 'https://g1.globo.com/rss';
    const res = await fetch(`${base}/proxy?url=${encodeURIComponent(target)}`);
    expect(res.status).toBe(418);
    expect(await res.text()).toBe('teapot');
    expect(upstream).toHaveBeenCalledWith(target, expect.objectContaining({ redirect: 'manual' }));
  });

  it('returns 403 for hosts outside the allowlist', async () => {
    const upstream = vi.fn();
    const base = await start(upstream);
    const res = await fetch(`${base}/proxy?url=${encodeURIComponent('https://evil.example')}`);
    expect(res.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('returns 403 when a redirect leads outside the allowlist', async () => {
    const upstream = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: 'https://evil.example' } }),
      );
    const base = await start(upstream);
    const res = await fetch(`${base}/proxy?url=${encodeURIComponent('https://g1.globo.com/x')}`);
    expect(res.status).toBe(403);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('follows allowlisted redirects, resolving relative locations', async () => {
    const upstream = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: '/b' } }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    const base = await start(upstream);
    const res = await fetch(`${base}/proxy?url=${encodeURIComponent('https://g1.globo.com/a')}`);
    expect(await res.text()).toBe('ok');
    expect(upstream.mock.calls[1]?.[0]).toBe('https://g1.globo.com/b');
  });

  it('returns 502 after more than 3 redirects', async () => {
    const upstream = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(null, { status: 302, headers: { location: 'https://g1.globo.com/n' } }),
        ),
      );
    const base = await start(upstream);
    const res = await fetch(`${base}/proxy?url=${encodeURIComponent('https://g1.globo.com/a')}`);
    expect(res.status).toBe(502);
  });

  it('returns 502 when the body exceeds 2 MB', async () => {
    const big = new Response('x'.repeat(2 * 1024 * 1024 + 1));
    const base = await start(vi.fn().mockResolvedValue(big));
    const res = await fetch(`${base}/proxy?url=${encodeURIComponent('https://g1.globo.com/a')}`);
    expect(res.status).toBe(502);
  });

  it('returns 502 when the upstream fails or times out', async () => {
    const base = await start(vi.fn().mockRejectedValue(new DOMException('t', 'TimeoutError')));
    const res = await fetch(`${base}/proxy?url=${encodeURIComponent('https://g1.globo.com/a')}`);
    expect(res.status).toBe(502);
  });

  it('passes a timeout signal upstream', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response('ok'));
    const base = await start(upstream);
    await fetch(`${base}/proxy?url=${encodeURIComponent('https://g1.globo.com/a')}`);
    expect(upstream.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
