import { describe, expect, it } from 'vitest';

import { pickQuality } from './quality';

describe('pickQuality', () => {
  it.each([
    [60, { cols: 18, rows: 11, scale: 0.6, fps: 30 }],
    [50, { cols: 18, rows: 11, scale: 0.6, fps: 30 }],
    [49, { cols: 12, rows: 7, scale: 0.5, fps: 24 }],
    [32.6, { cols: 12, rows: 7, scale: 0.5, fps: 24 }],
    [25, { cols: 12, rows: 7, scale: 0.5, fps: 24 }],
    [24, { cols: 12, rows: 7, scale: 0.4, fps: 12 }],
    [12, { cols: 12, rows: 7, scale: 0.4, fps: 12 }],
    [11, { cols: 12, rows: 7, scale: 0.4, fps: 0 }],
    [0, { cols: 12, rows: 7, scale: 0.4, fps: 0 }],
  ])('%s fps', (measured, expected) => {
    expect(pickQuality(measured)).toEqual(expected);
  });
});
