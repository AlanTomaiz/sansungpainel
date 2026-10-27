import { describe, expect, it } from 'vitest';

import { rowOffsetPx } from './row-layout';

describe('rowOffsetPx', () => {
  it('calcula deslocamento com divisor', () => {
    expect(rowOffsetPx(0, 2)).toBe(0);
    expect(rowOffsetPx(2, 2)).toBe(258);
    expect(rowOffsetPx(3, 0)).toBe(336);
  });
});
