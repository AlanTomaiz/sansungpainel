import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';

import { isAllowed } from './allowlist.ts';

const PORT = 8787;

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

const TIMEOUT_MS = 8000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_HOPS = 3;

class Forbidden extends Error {}

async function fetchAllowed(target: string, fetchFn: FetchFn): Promise<Response> {
  let current = target;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const res = await fetchFn(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const location = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !location) return res;
    await res.body?.cancel();
    current = new URL(location, current).href;
    if (!isAllowed(current)) throw new Forbidden();
  }
  throw new Error('too-many-redirects');
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error('too-large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function send(res: ServerResponse, status: number, body: string, type = 'text/plain'): void {
  res.writeHead(status, {
    'Content-Type': `${type}; charset=utf-8`,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

async function proxy(target: string | null, res: ServerResponse, fetchFn: FetchFn): Promise<void> {
  if (!target || !isAllowed(target)) return send(res, 403, 'forbidden');
  try {
    const upstream = await fetchAllowed(target, fetchFn);
    send(res, upstream.status, await readCapped(upstream), 'text/plain');
  } catch (error) {
    if (error instanceof Forbidden) return send(res, 403, 'forbidden');
    send(res, 502, 'bad gateway');
  }
}

export function createRelay(fetchFn: FetchFn = (url, init) => fetch(url, init)): Server {
  return createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (req.method !== 'GET') return send(res, 405, 'method not allowed');
    if (url.pathname === '/health') return send(res, 200, '{"ok":true}', 'application/json');
    if (url.pathname === '/proxy') return void proxy(url.searchParams.get('url'), res, fetchFn);
    send(res, 404, 'not found');
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createRelay().listen(PORT, '0.0.0.0', () => console.log(`relay em :${PORT}`));
}
