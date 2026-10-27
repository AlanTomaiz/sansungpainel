import type { NewsTheme } from './config';

export type Theme = NewsTheme;
export interface Item {
  title: string;
  link: string;
  pubDate: number;
}
export interface Headline {
  theme: Theme;
  title: string;
}

export const THEMES: Theme[] = ['Brasil', 'Games', 'Tecnologia', 'Economia'];

export function pickHeadlines(byTheme: Record<Theme, Item[]>, rotation: number): Headline[] {
  const out: Headline[] = [];
  for (const theme of THEMES) {
    const items = byTheme[theme];
    const item = items[rotation % items.length];
    if (item) out.push({ theme, title: item.title });
  }
  return out;
}
