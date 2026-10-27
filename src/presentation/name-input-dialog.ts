import { saveInputName } from '@/application/input-names';
import type { Store } from '@/application/ports';
import type { InputDevice } from '@/domain/launchable';

import type { Key } from './keys';

const OPTIONS: { label: string; device: InputDevice }[] = [
  { label: 'PS5', device: 'ps5' },
  { label: 'Chromecast', device: 'cast' },
  { label: 'Notebook', device: 'pc' },
  { label: 'PC', device: 'pc' },
  { label: 'Outro', device: 'other' },
];

export interface NameDialog {
  el: HTMLElement;
  handleKey(key: Key): void;
}

export function createNameDialog(
  port: number,
  store: Store,
  onDone: (saved: boolean) => void,
): NameDialog {
  const el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML =
    '<div class="dialog"><h2></h2><p>OK confirma. Voltar pula.</p><div class="opts"></div></div>';
  (el.querySelector('h2') as HTMLElement).textContent = `Qual aparelho está no HDMI ${port}?`;
  const opts = OPTIONS.map((o) => {
    const node = document.createElement('div');
    node.className = 'opt';
    node.textContent = o.label;
    (el.querySelector('.opts') as HTMLElement).appendChild(node);
    return node;
  });
  let index = 0;
  const paint = (): void => opts.forEach((n, i) => n.classList.toggle('f', i === index));
  paint();

  return {
    el,
    handleKey(key) {
      if (key === 'left') index = Math.max(0, index - 1);
      else if (key === 'right') index = Math.min(OPTIONS.length - 1, index + 1);
      else if (key === 'back') return onDone(false);
      else if (key === 'ok') {
        const choice = OPTIONS[index] as (typeof OPTIONS)[number];
        const name = choice.device === 'other' ? 'Aparelho' : choice.label;
        saveInputName(store, port, choice.device, name);
        return onDone(true);
      }
      paint();
    },
  };
}
