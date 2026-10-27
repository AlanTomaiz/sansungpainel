import { describe, expect, it } from 'vitest';

import { measureLatency } from './measure-latency';

describe('measureLatency', () => {
  it('devolve a média de 3 medições', async () => {
    let t = 0;
    const steps = [10, 20, 30];
    const head = async (): Promise<void> => {
      t += steps.shift() ?? 0;
    };
    expect(await measureLatency(head, () => t)).toBe(20);
  });

  it('devolve null quando falha', async () => {
    expect(
      await measureLatency(
        () => Promise.reject(new Error('x')),
        () => 0,
      ),
    ).toBeNull();
  });
});
