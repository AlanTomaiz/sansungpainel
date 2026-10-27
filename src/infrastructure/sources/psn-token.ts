import type { Store } from '@/application/ports';
import { NetworkError } from '@/domain/card-state';
import { PsnAuthError } from '@/domain/psn';

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

const TOKEN_URL = 'https://ca.account.sony.com/api/authz/v3/oauth/token';
const BASIC = 'Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=';
const SCOPE = 'psn:mobile.v2.core psn:clientapp';
const REFRESH_KEY = 'psn.refreshToken';
const TIMEOUT_MS = 8000;
const SKEW_MS = 5 * 60 * 1000;

export interface JsonReply {
  ok: boolean;
  status: number;
  data: unknown;
}

export async function timedJson(
  fetchFn: FetchFn,
  url: string,
  init: RequestInit,
): Promise<JsonReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchFn(url, { ...init, signal: controller.signal });
    const data: unknown = res.ok ? await res.json() : null;
    return { ok: res.ok, status: res.status, data };
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }
}

export interface AccessTokenDeps {
  fetchFn: FetchFn;
  store: Store;
  bundled: string;
  now: () => number;
}

interface Grant {
  access: string;
  refresh?: string;
  expiresAt: number;
}

async function requestGrant(refreshToken: string, deps: AccessTokenDeps): Promise<Grant> {
  const res = await timedJson(deps.fetchFn, TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: BASIC, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      token_format: 'jwt',
      scope: SCOPE,
    }).toString(),
  });
  if (res.status === 400 || res.status === 401) throw new PsnAuthError();
  if (!res.ok) throw new Error('psn-unavailable');
  const data = res.data as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return {
    access: data.access_token,
    refresh: data.refresh_token,
    expiresAt: deps.now() + data.expires_in * 1000,
  };
}

async function grantFromStoredOrBundled(deps: AccessTokenDeps): Promise<Grant> {
  const stored = deps.store.get<string>(REFRESH_KEY);
  if (!stored || stored === deps.bundled) return requestGrant(deps.bundled, deps);
  try {
    return await requestGrant(stored, deps);
  } catch (error) {
    if (!(error instanceof PsnAuthError)) throw error;
    deps.store.remove(REFRESH_KEY);
    return requestGrant(deps.bundled, deps);
  }
}

export interface AccessToken {
  get(): Promise<string>;
  invalidate(): void;
}

export function createAccessToken(deps: AccessTokenDeps): AccessToken {
  let current: Grant | null = null;
  return {
    get: async () => {
      if (current && current.expiresAt - SKEW_MS > deps.now()) return current.access;
      current = await grantFromStoredOrBundled(deps);
      if (current.refresh) deps.store.set(REFRESH_KEY, current.refresh);
      return current.access;
    },
    invalidate: () => {
      current = null;
    },
  };
}
