import { describe, expect, it } from 'vitest';

import { NetworkError, RelayUnreachableError } from '@/domain/card-state';
import { MemoryStore } from '@/infrastructure/fake/fakes';

import { type DataSource, refreshCard } from './refresh-card';

const source = (fetch: () => Promise<number>): DataSource<number> => ({
  key: 'n',
  ttlMs: 1000,
  fetch,
});

describe('refreshCard', () => {
  it('grava o cache e devolve ok em caso de sucesso', async () => {
    const store = new MemoryStore();
    const s = await refreshCard(
      source(async () => 7),
      store,
      () => 100,
    );
    expect(s).toEqual({ status: 'ok', data: 7, updatedAt: 100 });
    const again = await refreshCard(
      source(() => Promise.reject(new NetworkError())),
      store,
      () => 900,
    );
    expect(again).toMatchObject({ status: 'stale', data: 7, updatedAt: 100 });
  });

  it('devolve stale com o updatedAt do cache quando falha', async () => {
    const store = new MemoryStore();
    await refreshCard(
      source(async () => 7),
      store,
      () => 100,
    );
    const s = await refreshCard(
      source(() => Promise.reject(new NetworkError())),
      store,
      () => 900,
    );
    expect(s).toEqual({ status: 'stale', data: 7, updatedAt: 100, reason: 'Sem conexão' });
  });

  it('devolve unavailable quando falha sem cache', async () => {
    const s = await refreshCard(
      source(() => Promise.reject(new NetworkError())),
      new MemoryStore(),
      () => 1,
    );
    expect(s).toEqual({ status: 'unavailable', reason: 'Sem conexão' });
  });

  it('explica relay inacessível', async () => {
    const s = await refreshCard(
      source(() => Promise.reject(new RelayUnreachableError())),
      new MemoryStore(),
      () => 1,
    );
    expect(s).toEqual({ status: 'unavailable', reason: 'Indisponível (PC desligado)' });
  });

  it('relay fora com cache devolve stale com o motivo do relay', async () => {
    const store = new MemoryStore();
    await refreshCard(
      source(async () => 7),
      store,
      () => 100,
    );
    const s = await refreshCard(
      source(() => Promise.reject(new RelayUnreachableError())),
      store,
      () => 900,
    );
    expect(s).toEqual({
      status: 'stale',
      data: 7,
      updatedAt: 100,
      reason: 'Indisponível (PC desligado)',
    });
  });

  it('erro que não é de rede usa Fonte indisponível', async () => {
    const s = await refreshCard(
      source(() => Promise.reject(new Error('HTTP 500'))),
      new MemoryStore(),
      () => 1,
    );
    expect(s).toEqual({ status: 'unavailable', reason: 'Fonte indisponível' });
  });

  it('falha ao gravar o cache não vira erro', async () => {
    const store = new MemoryStore();
    store.set = () => {
      throw new Error('quota');
    };
    const s = await refreshCard(
      source(async () => 7),
      store,
      () => 100,
    );
    expect(s).toEqual({ status: 'ok', data: 7, updatedAt: 100 });
  });
});
