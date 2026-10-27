// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import type { Quote } from '@/domain/quote';

import { formatBid, formatPct, mountQuotesCard } from './quotes-card';

describe('quotes card', () => {
  it('formata em pt-BR com BTC em mil', () => {
    expect(formatBid({ code: 'USD', bid: 5.4213, pct: 0 })).toBe('5,42');
    expect(formatBid({ code: 'BTC', bid: 612345, pct: 0 })).toBe('612 mil');
    expect(formatPct(-0.31)).toBe('−0,3%');
    expect(formatPct(0)).toBe('+0,0%');
    expect(formatPct(2.4)).toBe('+2,4%');
  });

  it('colore variação e unavailable não mostra dado', () => {
    const card = mountQuotesCard();
    card.update({
      status: 'ok',
      updatedAt: 0,
      data: [
        { code: 'USD', bid: 5.4, pct: -0.3 },
        { code: 'EUR', bid: 6.1, pct: 0 },
        { code: 'BTC', bid: 612000, pct: 2.4 },
      ],
    });
    const cls = Array.from(card.el.querySelectorAll('.d')).map((n) => n.className);
    expect(cls).toEqual(['d down', 'd up', 'd up']);
    card.update({ status: 'unavailable', reason: 'Sem conexão' });
    expect(card.el.querySelector('.quotes')).toBeNull();
    expect(card.el.textContent).toContain('Sem conexão');
  });

  it('stale mantém o último dado com o motivo e a hora', () => {
    const card = mountQuotesCard();
    const data: Quote[] = [{ code: 'USD', bid: 5.4, pct: 0.2 }];
    const at = new Date().setHours(14, 3, 0, 0);
    card.update({ status: 'stale', data, updatedAt: at, reason: 'Sem conexão' });
    expect(card.el.querySelector('.quotes')?.textContent).toContain('5,40');
    expect(card.el.querySelector('.stale')?.textContent).toBe('Sem conexão · atualizado às 14:03');
  });
});
