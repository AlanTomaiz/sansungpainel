import { afterEach, describe, expect, it, vi } from 'vitest';

import { MemoryStore } from '@/infrastructure/fake/fakes';

import { startScheduler } from './scheduler';

afterEach(() => vi.useRealTimers());

describe('startScheduler', () => {
  it('roda já, repete a cada ttl e para ao parar', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue(1);
    const onState = vi.fn();
    const { stop } = startScheduler([{ source: { key: 'k', ttlMs: 1000, fetch }, onState }], {
      store: new MemoryStore(),
      now: () => 0,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenCalledWith({ status: 'ok', data: 1, updatedAt: 0 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(2);
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('refreshDue roda só as fontes vencidas', async () => {
    vi.useFakeTimers();
    let now = 0;
    const slow = vi.fn().mockResolvedValue(1);
    const fast = vi.fn().mockResolvedValue(2);
    const { refreshDue } = startScheduler(
      [
        { source: { key: 'slow', ttlMs: 10000, fetch: slow }, onState: vi.fn() },
        { source: { key: 'fast', ttlMs: 1000, fetch: fast }, onState: vi.fn() },
      ],
      { store: new MemoryStore(), now: () => now },
    );
    await vi.advanceTimersByTimeAsync(0);
    now = 5000;
    refreshDue();
    await vi.advanceTimersByTimeAsync(0);
    expect(fast).toHaveBeenCalledTimes(2);
    expect(slow).toHaveBeenCalledTimes(1);
  });

  it('semeia o estado do cache como stale antes do primeiro fetch', async () => {
    vi.useFakeTimers();
    const store = new MemoryStore();
    store.set('card.k.v1', { data: 7, updatedAt: 123 });
    const onState = vi.fn();
    startScheduler(
      [{ source: { key: 'k', ttlMs: 1000, fetch: () => new Promise(() => undefined) }, onState }],
      { store, now: () => 0 },
    );
    expect(onState).toHaveBeenCalledWith({
      status: 'stale',
      data: 7,
      updatedAt: 123,
      reason: 'Atualizando…',
    });
  });

  it('refreshDue não duplica o fetch enquanto um está em andamento', async () => {
    vi.useFakeTimers();
    let now = 0;
    const fetch = vi.fn(() => new Promise<number>(() => undefined));
    const { refreshDue } = startScheduler(
      [{ source: { key: 'k', ttlMs: 1000, fetch }, onState: vi.fn() }],
      { store: new MemoryStore(), now: () => now },
    );
    now = 5000;
    refreshDue();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
