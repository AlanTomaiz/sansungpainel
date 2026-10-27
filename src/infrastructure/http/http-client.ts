import { NetworkError, RelayUnreachableError } from '@/domain/card-state';
import type { SourceRoute } from '@/domain/config';

export interface HttpClient {
  getText(url: string, route: SourceRoute): Promise<string>;
  head(url: string): Promise<void>;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

const TIMEOUT_MS = 8000;

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export class FetchHttpClient implements HttpClient {
  constructor(
    private readonly relayBase: string | null,
    private readonly fetchFn: FetchFn = (i, init) => fetch(i, init),
  ) {}

  async getText(url: string, route: SourceRoute): Promise<string> {
    if (route === 'direct') return this.request(url, {}, 'GET');
    if (!this.relayBase) throw new RelayUnreachableError();
    try {
      return await this.request(
        `${this.relayBase}/proxy?url=${encodeURIComponent(url)}`,
        {},
        'GET',
      );
    } catch (error) {
      throw error instanceof NetworkError ? new RelayUnreachableError() : error;
    }
  }

  async head(url: string): Promise<void> {
    await this.request(url, { mode: 'no-cors', cache: 'no-store' }, 'HEAD');
  }

  private async request(url: string, init: RequestInit, method: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchFn(url, {
        ...init,
        method,
        signal: controller.signal,
      }).catch(() => {
        throw new NetworkError();
      });
      if (res.type !== 'opaque' && !res.ok)
        throw new HttpError(res.status, await res.text().catch(() => ''));
      return method === 'GET' ? await res.text() : '';
    } finally {
      clearTimeout(timer);
    }
  }
}
