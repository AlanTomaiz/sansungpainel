// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { createHeroView } from './hero-view';

describe('createHeroView', () => {
  it('anima o destaque com Web Animations sem forcar layout', () => {
    const hero = createHeroView();
    const animate = vi.fn();
    hero.el.animate = animate;
    const layout = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get');
    hero.show({ kind: 'tv' });
    expect(animate).toHaveBeenCalledWith([{ opacity: 0 }, { opacity: 1 }], {
      duration: 300,
      easing: 'ease-out',
    });
    expect(layout).not.toHaveBeenCalled();
    expect(hero.el.querySelector('h1')?.textContent).toBe('TV aberta');
  });
});
