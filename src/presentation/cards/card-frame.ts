import type { CardState } from '@/domain/card-state';
import { staleLabel } from '@/domain/stale-label';

export interface CardFrame {
  el: HTMLElement;
  body: HTMLElement;
  setState<T>(s: CardState<T>, render: (data: T) => void): void;
}

function note(className: string, text: string): HTMLElement {
  const n = document.createElement('div');
  n.className = className;
  n.textContent = text;
  return n;
}

export function mountCardFrame(title: string, aside?: string): CardFrame {
  const el = document.createElement('section');
  el.className = 'tc';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  if (aside) {
    const small = document.createElement('small');
    small.textContent = aside;
    h2.append(' ', small);
  }
  const body = document.createElement('div');
  body.className = 'cbody';
  el.append(h2, body);

  const setState: CardFrame['setState'] = (s, render) => {
    body.textContent = '';
    if (s.status === 'loading') body.appendChild(note('pending', 'Carregando…'));
    else if (s.status === 'unavailable') body.appendChild(note('pending', s.reason));
    else {
      render(s.data);
      if (s.status === 'stale') {
        body.appendChild(note('stale', `${s.reason} · ${staleLabel(s.updatedAt, Date.now())}`));
      }
    }
  };
  return { el, body, setState };
}
