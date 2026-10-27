import type { DataSource } from '@/application/refresh-card';
import type { PainelConfig, SourceRoute } from '@/domain/config';
import { type Item, type Theme, THEMES } from '@/domain/news';
import type { HttpClient } from '@/infrastructure/http/http-client';

const TTL_MS = 15 * 60 * 1000;
const MAX_ITEMS = 6;

const clean = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

export function parseRss(xml: string): Item[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('rss inválido');
  return Array.from(doc.querySelectorAll('item'))
    .map((node) => ({
      title: clean(node.querySelector(':scope > title')?.textContent),
      link: clean(node.querySelector(':scope > link')?.textContent),
      pubDate: Date.parse(clean(node.querySelector(':scope > pubDate')?.textContent)) || 0,
    }))
    .filter((item) => item.title !== '');
}

export function createNewsSource(
  http: HttpClient,
  route: SourceRoute,
  feeds: PainelConfig['news'],
): DataSource<Record<Theme, Item[]>> {
  return {
    key: 'news',
    ttlMs: TTL_MS,
    fetch: async () => {
      const results = await Promise.allSettled(
        feeds.map(async (f) => parseRss(await http.getText(f.url, route))),
      );
      const data = Object.fromEntries(THEMES.map((t) => [t, [] as Item[]])) as Record<
        Theme,
        Item[]
      >;
      results.forEach((r, i) => {
        const feed = feeds[i];
        if (r.status === 'fulfilled' && feed)
          data[feed.theme] = [...data[feed.theme], ...r.value.slice(0, MAX_ITEMS)];
      });
      const failed = results.find((r) => r.status === 'rejected');
      if (failed && results.every((r) => r.status === 'rejected')) throw failed.reason;
      return data;
    },
  };
}
