import {
  type CardState,
  NetworkError,
  ReasonError,
  RelayUnreachableError,
} from '@/domain/card-state';

import type { Store } from './ports';

export interface DataSource<T> {
  key: string;
  ttlMs: number;
  fetch(): Promise<T>;
}

interface Cached<T> {
  data: T;
  updatedAt: number;
}

const cacheKey = (key: string): string => `card.${key}.v1`;

function failureReason(error: unknown): string {
  if (error instanceof ReasonError) return error.message;
  if (error instanceof RelayUnreachableError) return 'Indisponível (PC desligado)';
  return error instanceof NetworkError ? 'Sem conexão' : 'Fonte indisponível';
}

export function cachedState<T>(src: DataSource<T>, store: Store): CardState<T> | null {
  const cached = store.get<Cached<T>>(cacheKey(src.key));
  if (!cached) return null;
  return {
    status: 'stale',
    data: cached.data,
    updatedAt: cached.updatedAt,
    reason: 'Atualizando…',
  };
}

export async function refreshCard<T>(
  src: DataSource<T>,
  store: Store,
  now: () => number,
): Promise<CardState<T>> {
  let data: T;
  try {
    data = await src.fetch();
  } catch (error) {
    const reason = failureReason(error);
    const cached = store.get<Cached<T>>(cacheKey(src.key));
    if (!cached) return { status: 'unavailable', reason };
    return { status: 'stale', data: cached.data, updatedAt: cached.updatedAt, reason };
  }
  const updatedAt = now();
  try {
    store.set<Cached<T>>(cacheKey(src.key), { data, updatedAt });
  } catch {
    /* cache is best effort */
  }
  return { status: 'ok', data, updatedAt };
}
