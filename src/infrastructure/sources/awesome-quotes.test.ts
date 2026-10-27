import { describe, expect, it } from 'vitest';

import { parseAwesomeQuotes } from './awesome-quotes';

const raw = (code: string, bid: string, pct: string): string =>
  `"${code}BRL":{"bid":"${bid}","pctChange":"${pct}"}`;

describe('parseAwesomeQuotes', () => {
  it('converte bid e pctChange em números', () => {
    const text = `{${raw('USD', '5.4213', '-0.31')},${raw('EUR', '6.18', '0.1')},${raw('BTC', '612000', '2.4')}}`;
    expect(parseAwesomeQuotes(text)).toEqual([
      { code: 'USD', bid: 5.4213, pct: -0.31 },
      { code: 'EUR', bid: 6.18, pct: 0.1 },
      { code: 'BTC', bid: 612000, pct: 2.4 },
    ]);
  });

  it('rejeita resposta sem alguma moeda', () => {
    expect(() => parseAwesomeQuotes(`{${raw('USD', '5', '0')}}`)).toThrow();
  });
});
