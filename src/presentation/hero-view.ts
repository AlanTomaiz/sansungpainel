import type { Launchable } from '@/domain/launchable';

import { present } from './present';

const NOTICE_MS = 4000;

export interface HeroView {
  el: HTMLElement;
  show(item: Launchable): void;
  notify(message: string): void;
}

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}

export function createHeroView(): HeroView {
  const el = make('div', 'thero');
  const title = make('h1');
  const meta = make('p');
  const tag = make('div', 'tag');
  const notice = make('div', 'notice');
  el.append(title, meta, tag, notice);
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;

  const replay = (): void => {
    el.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
  };

  return {
    el,
    show(item) {
      const p = present(item);
      title.textContent = p.name;
      meta.textContent = p.meta;
      tag.textContent = '';
      if (p.port !== null) {
        tag.append(make('i'), `Ligado no HDMI ${p.port}`);
      }
      replay();
    },
    notify(message) {
      notice.textContent = message;
      if (noticeTimer) clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => (notice.textContent = ''), NOTICE_MS);
    },
  };
}
