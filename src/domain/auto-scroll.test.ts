import { describe, expect, it } from 'vitest';

import { planScroll } from './auto-scroll';

describe('planScroll', () => {
  it('não rola quando o conteúdo cabe', () => {
    expect(planScroll(200, 200)).toBeNull();
    expect(planScroll(150, 200)).toBeNull();
  });

  it('calcula distância e duração a 20 px/s com 3 s de pausa em cada ponta', () => {
    expect(planScroll(400, 300)).toEqual({
      distance: 100,
      durationMs: 11000,
      holdFraction: 3000 / 11000,
    });
  });
});
