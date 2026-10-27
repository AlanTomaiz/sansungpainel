import type { CardState } from '@/domain/card-state';
import type { Quote } from '@/domain/quote';

import { mountCardFrame } from './card-frame';

const LABELS: Record<Quote['code'], string> = { USD: 'Dólar', EUR: 'Euro', BTC: 'Bitcoin' };

const ptNumber = (n: number): string => n.toFixed(2).replace('.', ',');

export function formatBid(q: Quote): string {
  return q.code === 'BTC' ? `${Math.round(q.bid / 1000)} mil` : ptNumber(q.bid);
}

export function formatPct(pct: number): string {
  const sign = pct >= 0 ? '+' : '−';
  return `${sign}${Math.abs(pct).toFixed(1).replace('.', ',')}%`;
}

function quoteRow(q: Quote): HTMLElement {
  const row = document.createElement('div');
  const label = document.createElement('span');
  label.textContent = LABELS[q.code];
  const value = document.createElement('span');
  const bid = document.createElement('b');
  bid.textContent = formatBid(q);
  const delta = document.createElement('span');
  delta.className = `d ${q.pct >= 0 ? 'up' : 'down'}`;
  delta.textContent = formatPct(q.pct);
  value.append(bid, delta);
  row.append(label, value);
  return row;
}

export function mountQuotesCard(): { el: HTMLElement; update(s: CardState<Quote[]>): void } {
  const frame = mountCardFrame('Cotações');
  frame.setState({ status: 'loading' }, () => undefined);
  return {
    el: frame.el,
    update(s) {
      frame.setState(s, (quotes) => {
        const list = document.createElement('div');
        list.className = 'quotes';
        quotes.forEach((q) => list.appendChild(quoteRow(q)));
        frame.body.appendChild(list);
      });
    },
  };
}
