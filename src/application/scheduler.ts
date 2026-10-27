import type { CardState } from '@/domain/card-state';

import type { Store } from './ports';
import { cachedState, type DataSource, refreshCard } from './refresh-card';

export interface Binding<T> {
  source: DataSource<T>;
  onState(s: CardState<T>): void;
}

export interface Scheduler {
  stop(): void;
  refreshDue(): void;
}

export function startScheduler(
  bindings: Binding<unknown>[],
  deps: { store: Store; now: () => number },
): Scheduler {
  const runs = bindings.map(({ source, onState }) => {
    let lastRun = deps.now();
    let pending = false;
    const run = async (): Promise<void> => {
      if (pending) return;
      pending = true;
      lastRun = deps.now();
      try {
        onState(await refreshCard(source, deps.store, deps.now));
      } finally {
        pending = false;
      }
    };
    const seeded = cachedState(source, deps.store);
    if (seeded) onState(seeded);
    void run();
    const timer = setInterval(() => void run(), source.ttlMs);
    return { timer, run, isDue: () => deps.now() - lastRun >= source.ttlMs };
  });
  return {
    stop: () => runs.forEach((r) => clearInterval(r.timer)),
    refreshDue: () => runs.filter((r) => r.isDue()).forEach((r) => void r.run()),
  };
}
