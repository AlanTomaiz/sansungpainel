import { describe, expect, it } from 'vitest';

import { easeFactor, shouldDraw } from './throttle';

describe('shouldDraw', () => {
  it('skips before the interval minus tolerance', () => {
    expect(shouldDraw(1030, 1000, 1000 / 24).draw).toBe(false);
  });

  it('draws within 1 ms tolerance of the interval', () => {
    const r = shouldDraw(1041, 1000, 1000 / 24);
    expect(r.draw).toBe(true);
    expect(r.last).toBeCloseTo(1000 + 1000 / 24);
  });

  it('keeps a 24 fps target on a 60 Hz vsync cadence near 24', () => {
    let last = 0;
    let drawn = 0;
    for (let i = 1; i <= 600; i++) {
      const r = shouldDraw(i * (1000 / 60), last, 1000 / 24);
      if (r.draw) drawn++;
      last = r.last;
    }
    expect(drawn / 10).toBeGreaterThanOrEqual(23);
  });

  it('does not accumulate a backlog after a long stall', () => {
    const r = shouldDraw(5000, 1000, 1000 / 12);
    expect(r.draw).toBe(true);
    expect(r.last).toBeCloseTo(5000 - 1000 / 12);
  });
});

describe('easeFactor', () => {
  it('is 0.04 at one 60 Hz frame', () => {
    expect(easeFactor(1000 / 60)).toBeCloseTo(0.04, 3);
  });

  it('grows with elapsed time', () => {
    expect(easeFactor(100)).toBeGreaterThan(easeFactor(16.67));
  });
});
