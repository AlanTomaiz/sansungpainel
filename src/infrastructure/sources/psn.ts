import type { Store } from '@/application/ports';
import type { DataSource } from '@/application/refresh-card';
import { ReasonError } from '@/domain/card-state';
import { PsnAuthError, type PsnSummary } from '@/domain/psn';

import { buildSummary } from './psn-summary';
import { type AccessToken, createAccessToken, type FetchFn } from './psn-token';

const TTL_MS = 30 * 60 * 1000;
const NO_TOKEN_REASON = 'Configure o token da PSN (npm run token)';
const EXPIRED_REASON = 'Token da PSN expirou; rode npm run token';

export interface PsnSourceDeps {
  fetchFn: FetchFn;
  store: Store;
  refreshToken: string | null;
  now: () => number;
}

export function createPsnSource(deps: PsnSourceDeps): DataSource<PsnSummary> {
  const { fetchFn, refreshToken } = deps;
  const token = refreshToken ? createAccessToken({ ...deps, bundled: refreshToken }) : null;

  async function accessToken(source: AccessToken): Promise<string> {
    try {
      return await source.get();
    } catch (error) {
      if (error instanceof PsnAuthError) throw new ReasonError(EXPIRED_REASON);
      throw error;
    }
  }

  return {
    key: 'psn',
    ttlMs: TTL_MS,
    fetch: async () => {
      if (!token) throw new ReasonError(NO_TOKEN_REASON);
      try {
        return await buildSummary(await accessToken(token), fetchFn);
      } catch (error) {
        if (!(error instanceof PsnAuthError)) throw error;
        token.invalidate();
        return buildSummary(await accessToken(token), fetchFn);
      }
    },
  };
}
