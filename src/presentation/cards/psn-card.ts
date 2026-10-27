import type { CardState } from '@/domain/card-state';
import { type PsnDeal, type PsnSummary, shouldRotate, type TrophyGrade } from '@/domain/psn';

import { mountCardFrame } from './card-frame';

const ROTATE_MS = 6000;
const COLORS: Record<TrophyGrade, string> = {
  platinum: '#a9d8ff',
  gold: '#f2c94c',
  silver: '#cfd4dc',
  bronze: '#c98a50',
};
const GRADE_NAMES: Record<TrophyGrade, string> = {
  platinum: 'platina',
  gold: 'ouro',
  silver: 'prata',
  bronze: 'bronze',
};
const GRADES: TrophyGrade[] = ['platinum', 'gold', 'silver', 'bronze'];

const thousands = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const ptDecimal = (n: number): string => String(n).replace('.', ',');

function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function trophyPane(s: PsnSummary): HTMLElement {
  const pane = el('div', 'rot');
  const tro = el('div', 'tro');
  GRADES.forEach((g) => {
    const dot = el('i');
    dot.style.background = COLORS[g];
    const span = el('span');
    span.append(dot, thousands(s.counts[g]));
    tro.appendChild(span);
  });
  pane.appendChild(tro);
  if (s.last) {
    const last = el('div', 'last');
    last.append(
      el('b', undefined, s.last.name),
      `${s.last.game}, ${GRADE_NAMES[s.last.grade]}, ${ptDecimal(s.last.rarity)}% dos jogadores`,
    );
    pane.appendChild(last);
  }
  if (s.progress) {
    const bar = el('div', 'bar');
    const fill = el('i');
    fill.style.width = `${s.progress.pct}%`;
    bar.appendChild(fill);
    pane.appendChild(bar);
  }
  return pane;
}

function dealRow(d: PsnDeal): HTMLElement {
  const row = el('div', 'deal');
  const cover = el('div', 'cv');
  if (d.cover) cover.style.backgroundImage = `url("${d.cover}")`;
  const name = el('div', undefined, d.name);
  name.appendChild(el('small', undefined, `até ${d.until}`));
  const price = el('div', 'p', d.price);
  price.appendChild(el('s', undefined, d.was));
  row.append(cover, name, price);
  return row;
}

function dealsPane(deals: PsnDeal[]): HTMLElement {
  const pane = el('div', 'rot hide');
  deals.forEach((d) => pane.appendChild(dealRow(d)));
  return pane;
}

export function mountPsnCard(): { el: HTMLElement; update(s: CardState<PsnSummary>): void } {
  const frame = mountCardFrame('Troféus');
  frame.el.classList.add('psn');
  const heading = frame.el.querySelector('h2') as HTMLElement;
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = (): void => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const setHeading = (title: string, aside?: string): void => {
    heading.textContent = title;
    if (aside) heading.append(' ', el('small', undefined, aside));
  };
  const render = (s: PsnSummary): void => {
    const stack = el('div', 'psn-stack');
    const trophies = trophyPane(s);
    stack.appendChild(trophies);
    setHeading('Troféus', `nível ${s.level}`);
    frame.body.appendChild(stack);
    if (!shouldRotate(s)) return;
    const deals = dealsPane(s.deals);
    const dots = el('div', 'dots');
    const dotA = el('i', 'on');
    const dotB = el('i');
    dots.append(dotA, dotB);
    stack.append(deals, dots);
    let showA = true;
    timer = setInterval(() => {
      showA = !showA;
      trophies.classList.toggle('hide', !showA);
      deals.classList.toggle('hide', showA);
      dotA.classList.toggle('on', showA);
      dotB.classList.toggle('on', !showA);
      if (showA) setHeading('Troféus', `nível ${s.level}`);
      else setHeading('Promoções da sua lista');
    }, ROTATE_MS);
  };
  frame.setState({ status: 'loading' }, () => undefined);
  return {
    el: frame.el,
    update(s) {
      stop();
      if (s.status !== 'ok' && s.status !== 'stale') setHeading('Troféus');
      frame.setState(s, render);
    },
  };
}
