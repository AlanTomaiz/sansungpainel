import { describe, expect, it } from 'vitest';

import { keyFromEvent } from './keys';

describe('keyFromEvent', () => {
  it.each([
    [37, 'left'],
    [38, 'up'],
    [39, 'right'],
    [40, 'down'],
    [13, 'ok'],
    [10009, 'back'],
  ])('keyCode %i -> %s', (keyCode, key) => {
    expect(keyFromEvent({ keyCode })).toBe(key);
  });

  it('tecla desconhecida devolve null', () => {
    expect(keyFromEvent({ keyCode: 65 })).toBeNull();
  });

  it('cai no key do navegador no desktop', () => {
    expect(keyFromEvent({ keyCode: 0, key: 'Escape' })).toBe('back');
  });
});
