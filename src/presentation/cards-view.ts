const CARD_TITLES = ['Próximas horas', 'Notícias', 'Cotações', 'Troféus'];
const CLAMP_FROM = 40;

export interface CardsView {
  el: HTMLElement;
  count: number;
  setViews(views: HTMLElement[]): void;
  setView(index: number, view: HTMLElement): void;
  focus(index: number | null): void;
}

export function createCard(title: string, body?: HTMLElement): HTMLElement {
  const card = document.createElement('section');
  card.className = title.length > CLAMP_FROM ? 'tc clamp' : 'tc';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  card.appendChild(h2);
  card.appendChild(body ?? pendingBody());
  return card;
}

function pendingBody(): HTMLElement {
  const p = document.createElement('div');
  p.className = 'pending';
  p.textContent = 'Carregando…';
  return p;
}

export function createCardsView(): CardsView {
  const el = document.createElement('div');
  el.className = 'tgrid';
  let slots: HTMLElement[] = [];

  const build = (views: (HTMLElement | undefined)[]): void => {
    el.textContent = '';
    slots = CARD_TITLES.map((title, i) => views[i] ?? createCard(title));
    slots.forEach((s) => el.appendChild(s));
  };
  build([]);

  return {
    el,
    count: CARD_TITLES.length,
    setViews: build,
    setView(index, view) {
      const old = slots[index];
      if (!old) return;
      el.replaceChild(view, old);
      slots[index] = view;
    },
    focus(index) {
      slots.forEach((s, i) => s.classList.toggle('f', i === index));
    },
  };
}
