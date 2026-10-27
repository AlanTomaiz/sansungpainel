import type { Launchable } from '@/domain/launchable';
import { rowOffsetPx } from '@/domain/row-layout';

import { iconNode } from './icons';
import { present } from './present';

export interface RowView {
  el: HTMLElement;
  setItems(items: Launchable[], sepIndex: number): void;
  focus(index: number, active: boolean): void;
}

function buildItem(item: Launchable): HTMLElement {
  const p = present(item);
  const el = document.createElement('div');
  el.className = 'item';
  const app = document.createElement('div');
  app.className = p.port === null ? 'app' : 'app hdmi';
  app.style.background = p.bg;
  app.appendChild(iconNode(item));
  if (p.port !== null) {
    const port = document.createElement('span');
    port.className = 'port';
    port.textContent = p.sub;
    app.appendChild(port);
  }
  const lbl = document.createElement('div');
  lbl.className = 'lbl';
  const name = document.createElement('b');
  name.textContent = p.name;
  const sub = document.createElement('span');
  sub.textContent = p.sub;
  lbl.append(name, sub);
  el.append(app, lbl);
  return el;
}

const GROW_PX = 80;
const LABEL_PAD_PX = 36;
const LABEL_MAX_PX = 420;

function labelWidths(nodes: HTMLElement[]): number[] {
  return nodes.map((n) => {
    const lbl = n.querySelector<HTMLElement>('.lbl');
    return Math.min(lbl?.offsetWidth ?? 0, LABEL_MAX_PX);
  });
}

export function createRowView(): RowView {
  const el = document.createElement('div');
  el.className = 'rowwrap';
  const track = document.createElement('div');
  track.className = 'trow';
  el.appendChild(track);
  let nodes: HTMLElement[] = [];
  let sep = 0;
  let widths: number[] | null = null;
  let current = { index: 0, active: false };

  const view: RowView = {
    el,
    setItems(items, sepIndex) {
      sep = sepIndex;
      track.textContent = '';
      widths = null;
      nodes = items.map(buildItem);
      nodes.forEach((node, i) => {
        if (sepIndex > 0 && i === sepIndex) {
          const s = document.createElement('span');
          s.className = 'sep';
          track.appendChild(s);
        }
        track.appendChild(node);
      });
    },
    focus(index, active) {
      current = { index, active };
      track.classList.toggle('act', active);
      nodes.forEach((node, i) => node.classList.toggle('f', i === index));
      widths ??= labelWidths(nodes);
      shiftAfter(track, nodes[index], GROW_PX + LABEL_PAD_PX + (widths[index] ?? 0));
      track.style.transform = `translateX(${-rowOffsetPx(index, sep)}px)`;
    },
  };
  void document.fonts?.ready.then(() => {
    widths = null;
    view.focus(current.index, current.active);
  });
  return view;
}

function shiftAfter(track: HTMLElement, focused: HTMLElement | undefined, px: number): void {
  let after = false;
  for (const child of Array.from(track.children) as HTMLElement[]) {
    child.style.transform = after ? `translateX(${px}px)` : '';
    if (child === focused) after = true;
  }
}
