// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import type { Item, Theme } from '@/domain/news';

import * as autoScroll from '../auto-scroll';
import { mountNewsCard } from './news-card';

const item = (title: string): Item => ({ title, link: '', pubDate: 0 });
const data: Record<Theme, Item[]> = {
  Brasil: [item('b1')],
  Games: [item('g1')],
  Tecnologia: [item('t1')],
  Economia: [item('e1')],
};

describe('news card', () => {
  it('sem manchetes mostra aviso', () => {
    const card = mountNewsCard();
    card.update({
      status: 'ok',
      updatedAt: 0,
      data: { Brasil: [], Games: [], Tecnologia: [], Economia: [] },
    });
    expect(card.el.textContent).toContain('Sem manchetes agora');
    expect(card.el.querySelector('.news')).toBeNull();
  });

  it('mostra uma manchete por tema, com título inteiro, girando a cada atualização', () => {
    const card = mountNewsCard();
    const state = { status: 'ok' as const, updatedAt: 0, data };
    card.update(state);
    const rows = Array.from(card.el.querySelectorAll('.news div'));
    expect(rows.map((r) => r.querySelector('em')?.textContent)).toEqual([
      'Brasil',
      'Games',
      'Tecnologia',
      'Economia',
    ]);
    expect(rows[0]?.textContent).toBe('Brasilb1');
    card.update(state);
    expect(card.el.querySelector('.news div')?.textContent).toBe('Brasilb1');
  });

  it('reinicia a rolagem a cada troca de conteúdo', () => {
    const stop = vi.fn();
    vi.spyOn(autoScroll, 'attachAutoScroll').mockReturnValue(stop);
    const card = mountNewsCard();
    const state = { status: 'ok' as const, updatedAt: 0, data };
    card.update(state);
    expect(autoScroll.attachAutoScroll).toHaveBeenCalledTimes(1);
    card.update(state);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(autoScroll.attachAutoScroll).toHaveBeenCalledTimes(2);
  });

  it('mede a rolagem depois da nota stale', () => {
    let noteWasThere = false;
    const card = mountNewsCard();
    vi.spyOn(autoScroll, 'attachAutoScroll').mockImplementation(() => {
      noteWasThere = card.el.querySelector('.stale') !== null;
      return () => undefined;
    });
    card.update({ status: 'stale', updatedAt: 0, data, reason: 'Sem conexão' });
    expect(noteWasThere).toBe(true);
  });

  it('só avança a rotação com dado fresco', () => {
    const card = mountNewsCard();
    const multi = { ...data, Brasil: [item('b1'), item('b2')] };
    card.update({ status: 'stale', updatedAt: 0, data: multi, reason: 'Atualizando…' });
    card.update({ status: 'ok', updatedAt: 0, data: multi });
    expect(card.el.querySelector('.news div')?.textContent).toBe('Brasilb1');
  });
});
