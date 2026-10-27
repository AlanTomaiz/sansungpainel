import type { CardState } from '@/domain/card-state';
import { type Item, pickHeadlines, type Theme } from '@/domain/news';

import { attachAutoScroll } from '../auto-scroll';
import { mountCardFrame } from './card-frame';

type NewsData = Record<Theme, Item[]>;

export function mountNewsCard(): { el: HTMLElement; update(s: CardState<NewsData>): void } {
  const frame = mountCardFrame('Notícias');
  frame.setState({ status: 'loading' }, () => undefined);
  frame.body.classList.add('news-body');
  let rotation = 0;
  let stopScroll = (): void => undefined;
  const target: { view?: HTMLElement; list?: HTMLElement } = {};
  return {
    el: frame.el,
    update(s) {
      stopScroll();
      stopScroll = () => undefined;
      target.view = undefined;
      target.list = undefined;
      frame.setState(s, (data) => {
        const headlines = pickHeadlines(data, s.status === 'ok' ? rotation++ : rotation);
        if (headlines.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'pending';
          empty.textContent = 'Sem manchetes agora';
          frame.body.appendChild(empty);
          return;
        }
        const list = document.createElement('div');
        list.className = 'news';
        headlines.forEach((h) => {
          const row = document.createElement('div');
          const theme = document.createElement('em');
          theme.textContent = h.theme;
          row.append(theme, h.title);
          list.appendChild(row);
        });
        const view = document.createElement('div');
        view.className = 'news-view';
        view.appendChild(list);
        frame.body.appendChild(view);
        target.view = view;
        target.list = list;
      });
      if (target.view && target.list) stopScroll = attachAutoScroll(target.view, target.list);
    },
  };
}
