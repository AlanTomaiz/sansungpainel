import { describe, expect, it } from 'vitest';

import { iconKind } from './icons-weather';

describe('iconKind', () => {
  it('85 e 86 são neve, 95 é tempestade', () => {
    expect(iconKind(85)).toBe('snow');
    expect(iconKind(86)).toBe('snow');
    expect(iconKind(95)).toBe('storm');
  });
});
