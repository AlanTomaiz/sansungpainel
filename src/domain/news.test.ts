import { describe, expect, it } from 'vitest';

import { type Item, pickHeadlines, type Theme } from './news';

const item = (title: string): Item => ({ title, link: `https://x/${title}`, pubDate: 0 });
const feed = (): Record<Theme, Item[]> => ({
  Brasil: [item('b1'), item('b2')],
  Games: [item('g1')],
  Tecnologia: [item('t1')],
  Economia: [item('e1')],
});

describe('pickHeadlines', () => {
  it('uma manchete por tema, na ordem Brasil, Games, Tecnologia, Economia', () => {
    expect(pickHeadlines(feed(), 0).map((h) => h.theme)).toEqual([
      'Brasil',
      'Games',
      'Tecnologia',
      'Economia',
    ]);
  });

  it('a rotação troca a notícia de cada tema', () => {
    expect(pickHeadlines(feed(), 1)[0]).toEqual({ theme: 'Brasil', title: 'b2' });
    expect(pickHeadlines(feed(), 2)[0]).toEqual({ theme: 'Brasil', title: 'b1' });
  });

  it('pula temas sem notícias', () => {
    const f = { ...feed(), Games: [] };
    expect(pickHeadlines(f, 0).map((h) => h.theme)).toEqual(['Brasil', 'Tecnologia', 'Economia']);
  });

  it('tudo vazio devolve lista vazia', () => {
    const f = { Brasil: [], Games: [], Tecnologia: [], Economia: [] };
    expect(pickHeadlines(f, 0)).toEqual([]);
  });
});
