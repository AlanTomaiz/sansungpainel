// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { NetworkError } from '@/domain/card-state';
import type { NewsTheme } from '@/domain/config';
import type { HttpClient } from '@/infrastructure/http/http-client';

import { createNewsSource, parseRss } from './rss-news';

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>g1</title>
<item><title><![CDATA[  Primeira   manchete  ]]></title><link>https://g1.globo.com/a</link><pubDate>Tue, 27 Oct 2026 14:00:00 -0300</pubDate></item>
<item><title>Segunda &amp; terceira</title><link>https://g1.globo.com/b</link><pubDate>Tue, 27 Oct 2026 13:00:00 -0300</pubDate></item>
<item><title>
  Terceira
</title><link>https://g1.globo.com/c</link><pubDate>Tue, 27 Oct 2026 12:00:00 -0300</pubDate></item>
</channel></rss>`;

const feeds: { theme: NewsTheme; url: string }[] = [
  { theme: 'Brasil', url: 'u/brasil' },
  { theme: 'Games', url: 'u/games' },
];

const http = (fail: string[]): HttpClient => ({
  head: async () => undefined,
  getText: async (url) => {
    if (fail.includes(url)) throw new NetworkError();
    return RSS;
  },
});

describe('parseRss', () => {
  it('extrai 3 itens com título limpo de CDATA e espaços', () => {
    const items = parseRss(RSS);
    expect(items.map((i) => i.title)).toEqual([
      'Primeira manchete',
      'Segunda & terceira',
      'Terceira',
    ]);
    expect(items[0]?.link).toBe('https://g1.globo.com/a');
    expect(items[0]?.pubDate).toBe(Date.parse('2026-10-27T14:00:00-03:00'));
  });

  it('descarta itens sem título e ignora title/link aninhados', () => {
    const xml = `<rss><channel><item><title> </title><link>l</link></item>
<item><title>Ok</title><link>https://a</link><image><title>img</title></image></item></channel></rss>`;
    expect(parseRss(xml).map((i) => i.title)).toEqual(['Ok']);
  });

  it('rejeita XML inválido', () => {
    expect(() => parseRss('<rss><oops')).toThrow();
  });
});

describe('createNewsSource', () => {
  it('pula o tema que falhou', async () => {
    const data = await createNewsSource(http(['u/games']), 'direct', feeds).fetch();
    expect(data.Brasil).toHaveLength(3);
    expect(data.Games).toEqual([]);
  });

  it('concatena feeds do mesmo tema', async () => {
    const two = [...feeds, { theme: 'Brasil' as NewsTheme, url: 'u/brasil2' }];
    const data = await createNewsSource(http([]), 'direct', two).fetch();
    expect(data.Brasil).toHaveLength(6);
  });

  it('falha quando todos os temas falham', async () => {
    const src = createNewsSource(http(['u/brasil', 'u/games']), 'direct', feeds);
    await expect(src.fetch()).rejects.toBeInstanceOf(NetworkError);
  });
});
