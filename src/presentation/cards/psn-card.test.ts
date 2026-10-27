// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PsnSummary } from '@/domain/psn';

import { mountPsnCard } from './psn-card';

const base: PsnSummary = {
  level: 347,
  counts: { platinum: 12, gold: 98, silver: 311, bronze: 1204 },
  last: { name: 'Troféu Raro', game: 'Elden Ring', grade: 'gold', rarity: 4.1 },
  progress: { game: 'Elden Ring', pct: 78 },
  deals: [],
};
const deal = { name: 'Jogo da lista', price: 'R$ 149', was: 'R$ 299', until: '3/11', cover: '' };
const ok = (data: PsnSummary) => ({ status: 'ok' as const, data, updatedAt: 0 });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('psn card', () => {
  it('mostra nível, contagens pt-BR, último troféu e barra', () => {
    const card = mountPsnCard();
    card.update(ok(base));
    expect(card.el.querySelector('h2')?.textContent).toContain('nível 347');
    expect(Array.from(card.el.querySelectorAll('.tro span')).map((n) => n.textContent)).toEqual([
      '12',
      '98',
      '311',
      '1.204',
    ]);
    expect(card.el.querySelector('.last b')?.textContent).toBe('Troféu Raro');
    expect(card.el.querySelector('.last')?.textContent).toContain(
      'Elden Ring, ouro, 4,1% dos jogadores',
    );
    expect((card.el.querySelector('.bar i') as HTMLElement).style.width).toBe('78%');
  });

  it('marca o frame com a classe psn', () => {
    expect(mountPsnCard().el.classList.contains('psn')).toBe(true);
  });

  it('sem promoções não rotaciona nem mostra indicador', () => {
    const card = mountPsnCard();
    card.update(ok(base));
    expect(card.el.querySelector('.dots')).toBeNull();
    vi.advanceTimersByTime(20000);
    expect(card.el.querySelector('.rot.hide')).toBeNull();
  });

  it('com promoções alterna a cada 6 s e marca o indicador', () => {
    const card = mountPsnCard();
    card.update(ok({ ...base, deals: [deal] }));
    const [a, b] = Array.from(card.el.querySelectorAll('.rot'));
    const dots = Array.from(card.el.querySelectorAll('.dots i'));
    expect(dots).toHaveLength(2);
    expect(a?.classList.contains('hide')).toBe(false);
    vi.advanceTimersByTime(6000);
    expect(a?.classList.contains('hide')).toBe(true);
    expect(b?.classList.contains('hide')).toBe(false);
    expect(dots[1]?.classList.contains('on')).toBe(true);
    expect(card.el.querySelector('h2')?.textContent).toContain('Promoções');
    vi.advanceTimersByTime(6000);
    expect(a?.classList.contains('hide')).toBe(false);
  });

  it('unavailable mostra o motivo e para a rotação', () => {
    const card = mountPsnCard();
    card.update(ok({ ...base, deals: [deal] }));
    card.update({ status: 'unavailable', reason: 'Indisponível (PC desligado)' });
    expect(card.el.textContent).toContain('Indisponível (PC desligado)');
    expect(vi.getTimerCount()).toBe(0);
  });
});
