import type { OpenResult } from '@/application/open-item';
import type { Store } from '@/application/ports';
import { focusAfterRowChange, type FocusState, reduceFocus } from '@/domain/focus';
import type { Launchable, RGB } from '@/domain/launchable';

import { createCardsView } from './cards-view';
import { createHeroView } from './hero-view';
import { type Key, keyFromEvent } from './keys';
import { createNameDialog } from './name-input-dialog';
import { present } from './present';
import { createRowView } from './row-view';
import { createStatusView, type StatusViewHandle } from './status-view';

export interface ShellDeps {
  open(item: Launchable): Promise<OpenResult>;
  store: Store;
  exit(): void;
  reloadRow(): void;
}

export interface RowData {
  items: Launchable[];
  sepIndex: number;
  unnamedPorts?: number[];
}

export interface ShellHandle {
  setRow(row: RowData): void;
  setCards(views: HTMLElement[]): void;
  setCard(index: number, view: HTMLElement): void;
  notify(message: string): void;
  onHueChange(cb: (rgb: RGB) => void): void;
  onNavigate(cb: () => void): void;
  status: StatusViewHandle;
  state(): { focus: FocusState; rowLength: number; transform: string; overlay: boolean };
  dispose(): void;
}

interface Overlay {
  el: HTMLElement;
  handleKey(key: Key): void;
}

class Shell implements ShellHandle {
  readonly status = createStatusView();
  private readonly tv = document.createElement('div');
  private readonly row = createRowView();
  private readonly hero = createHeroView();
  private readonly cards = createCardsView();
  private items: Launchable[] = [];
  private focus: FocusState = { zone: 'row', row: 0, card: 0 };
  private overlay: Overlay | null = null;
  private lastShown: Launchable | null = null;
  private readonly hueListeners: ((rgb: RGB) => void)[] = [];
  private readonly navigateListeners: (() => void)[] = [];
  private readonly skippedPorts = new Set<number>();
  private readonly onKeydown = (e: KeyboardEvent): void => {
    const key = keyFromEvent(e);
    if (!key) return;
    e.preventDefault();
    this.onKey(key);
  };

  constructor(
    root: HTMLElement,
    private readonly deps: ShellDeps,
  ) {
    this.tv.className = 'tv';
    const canvas = document.createElement('canvas');
    canvas.id = 'poly';
    const shade = document.createElement('div');
    shade.className = 'shade';
    this.tv.append(canvas, shade, this.status.el, this.row.el, this.hero.el, this.cards.el);
    root.textContent = '';
    root.appendChild(this.tv);
    document.addEventListener('keydown', this.onKeydown);
  }

  setRow(data: RowData): void {
    this.focus = focusAfterRowChange(this.focus, this.items, data.items);
    this.items = data.items;
    this.row.setItems(this.items, data.sepIndex);
    this.lastShown = null;
    this.render();
    this.askNextName(data.unnamedPorts ?? []);
  }

  notify(message: string): void {
    this.hero.notify(message);
  }

  setCards(views: HTMLElement[]): void {
    this.cards.setViews(views);
    this.render();
  }

  setCard(index: number, view: HTMLElement): void {
    this.cards.setView(index, view);
    this.render();
  }

  onHueChange(cb: (rgb: RGB) => void): void {
    this.hueListeners.push(cb);
  }

  onNavigate(cb: () => void): void {
    this.navigateListeners.push(cb);
  }

  state(): ReturnType<ShellHandle['state']> {
    return {
      focus: this.focus,
      rowLength: this.items.length,
      transform: this.tv.querySelector<HTMLElement>('.trow')?.style.transform ?? '',
      overlay: this.overlay !== null,
    };
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeydown);
    this.status.dispose();
  }

  private render(): void {
    this.row.focus(this.focus.row, this.focus.zone === 'row');
    this.cards.focus(this.focus.zone === 'cards' ? this.focus.card : null);
    const item = this.items[this.focus.row];
    if (!item || item === this.lastShown) return;
    this.lastShown = item;
    this.hero.show(item);
    this.hueListeners.forEach((cb) => cb(present(item).hue));
  }

  private onKey(key: Key): void {
    if (this.overlay) return this.overlay.handleKey(key);
    if (key === 'back') return this.deps.exit();
    if (key === 'ok') return this.focus.zone === 'row' ? this.activate() : undefined;
    this.navigateListeners.forEach((cb) => cb());
    this.focus = reduceFocus(this.focus, key, this.items.length, this.cards.count);
    this.render();
  }

  private activate(): void {
    const item = this.items[this.focus.row];
    if (!item) return;
    void this.run(item);
  }

  private async run(item: Launchable): Promise<void> {
    const result = await this.deps.open(item);
    if (!result.ok) this.hero.notify(result.message);
  }

  private askNextName(unnamed: number[]): void {
    const port = unnamed.find((p) => !this.skippedPorts.has(p));
    if (port === undefined || this.overlay) return;
    this.openOverlay(
      createNameDialog(port, this.deps.store, (saved) => {
        this.skippedPorts.add(port);
        this.closeOverlay();
        if (saved) this.deps.reloadRow();
        else this.askNextName(unnamed);
      }),
    );
  }

  private openOverlay(next: Overlay): void {
    this.closeOverlay();
    this.overlay = next;
    this.tv.appendChild(next.el);
  }

  private closeOverlay(): void {
    this.overlay?.el.remove();
    this.overlay = null;
  }
}

export function mountShell(root: HTMLElement, deps: ShellDeps): ShellHandle {
  return new Shell(root, deps);
}
