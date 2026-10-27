import type { DataSource } from '@/application/refresh-card';
import type { SourceRoute } from '@/domain/config';
import type { Quote } from '@/domain/quote';
import type { HttpClient } from '@/infrastructure/http/http-client';

const URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL';
const CODES: Quote['code'][] = ['USD', 'EUR', 'BTC'];
const TTL_MS = 10 * 60 * 1000;

interface RawQuote {
  bid: string;
  pctChange: string;
}

export function parseAwesomeQuotes(text: string): Quote[] {
  const raw = JSON.parse(text) as Record<string, RawQuote | undefined>;
  return CODES.map((code) => {
    const item = raw[`${code}BRL`];
    const bid = item ? Number(item.bid) : NaN;
    const pct = item ? Number(item.pctChange) : NaN;
    if (!Number.isFinite(bid) || !Number.isFinite(pct)) throw new Error(`cotação ${code} inválida`);
    return { code, bid, pct };
  });
}

export function createQuotesSource(http: HttpClient, route: SourceRoute): DataSource<Quote[]> {
  return {
    key: 'quotes',
    ttlMs: TTL_MS,
    fetch: async () => parseAwesomeQuotes(await http.getText(URL, route)),
  };
}
