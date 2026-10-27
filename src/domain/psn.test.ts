import { describe, expect, it } from 'vitest';

import { shouldRotate } from './psn';

const deal = { name: 'Jogo', price: 'R$ 1', was: 'R$ 2', until: '3/11', cover: '' };

describe('shouldRotate', () => {
  it('é falso sem promoções', () => {
    expect(shouldRotate({ deals: [] })).toBe(false);
  });
  it('é verdadeiro com promoções', () => {
    expect(shouldRotate({ deals: [deal] })).toBe(true);
  });
});
