import type { CardState } from '@/domain/card-state';
import { type Forecast, subtitle } from '@/domain/forecast';
import { weatherIcon } from '@/presentation/icons-weather';

import { mountCardFrame } from './card-frame';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LABEL_COUNT = 5;
const VB_H = 30;
const PAD = 4;

export function labelIndexes(len: number): number[] {
  const all = Array.from({ length: LABEL_COUNT }, (_, k) =>
    Math.round((k * (len - 1)) / (LABEL_COUNT - 1)),
  );
  return all.filter((v, i) => all.indexOf(v) === i);
}

export function curvePath(temps: number[]): string {
  const min = Math.min(...temps);
  const span = Math.max(...temps) - min;
  const step = 100 / Math.max(temps.length - 1, 1);
  const pts = temps.map((t, i) => ({
    x: i * step,
    y: span === 0 ? VB_H / 2 : VB_H - PAD - ((t - min) / span) * (VB_H - 2 * PAD),
  }));
  const f = (n: number): string => String(Math.round(n * 10) / 10);
  let d = `M${f(0)},${f(pts[0]?.y ?? 0)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[i - 1];
    if (!p || !q) continue;
    const mx = (p.x + q.x) / 2;
    d += ` C${f(mx)},${f(q.y)} ${f(mx)},${f(p.y)} ${f(p.x)},${f(p.y)}`;
  }
  return d;
}

function curveSvg(f: Forecast): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'curve');
  svg.setAttribute('viewBox', `0 0 100 ${VB_H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', curvePath(f.curve.map((c) => c.temp)));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#f2b33d');
  path.setAttribute('stroke-width', '3');
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.appendChild(path);
  return svg;
}

function render(body: HTMLElement, f: Forecast): void {
  const big = document.createElement('div');
  big.className = 'tbig';
  big.innerHTML = weatherIcon(f.code);
  big.append(`${Math.round(f.nowTemp)}°`);
  const sub = document.createElement('p');
  sub.className = 'tsub';
  sub.textContent = subtitle(f);
  const hours = document.createElement('div');
  hours.className = 'hours';
  labelIndexes(f.curve.length).forEach((i) => {
    const c = f.curve[i];
    if (!c) return;
    const s = document.createElement('span');
    s.textContent = c.hour;
    hours.appendChild(s);
  });
  body.append(big, sub, curveSvg(f), hours);
}

export function mountWeatherCard(): { el: HTMLElement; update(s: CardState<Forecast>): void } {
  const frame = mountCardFrame('Próximas horas');
  frame.body.className = 'cbody weather';
  frame.setState({ status: 'loading' }, () => undefined);
  return {
    el: frame.el,
    update: (s) => frame.setState(s, (f) => render(frame.body, f)),
  };
}
