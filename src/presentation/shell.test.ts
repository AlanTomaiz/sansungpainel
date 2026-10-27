// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { inputKey, type SavedInput } from '@/application/input-names';
import type { Launchable } from '@/domain/launchable';
import { MemoryStore } from '@/infrastructure/fake/fakes';

import { createCard, createCardsView } from './cards-view';
import { createNameDialog } from './name-input-dialog';
import { mountShell, type RowData, type ShellDeps, type ShellHandle } from './shell';

const input = (port: number, name: string, device: 'ps5' | 'cast' = 'ps5'): Launchable => ({
  kind: 'input',
  port,
  name,
  device,
  bg: '#00439c',
  hue: [40, 100, 255],
  meta: 'PlayStation 5',
});
const app = (id: string, name: string): Launchable => ({
  kind: 'app',
  appId: id,
  name,
  iconPath: null,
  bg: '#000',
  hue: [229, 9, 20],
  meta: 'Filmes e séries',
});

const ROW: RowData = {
  items: [
    input(1, 'PS5'),
    input(2, 'Chromecast', 'cast'),
    app('a', 'Netflix'),
    app('b', 'YouTube'),
    { kind: 'tv' },
  ],
  sepIndex: 2,
};

const press = (keyCode: number): void => {
  document.dispatchEvent(new KeyboardEvent('keydown', { keyCode, bubbles: true }));
};

let shell: ShellHandle;
let deps: ShellDeps;
let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
  deps = {
    open: vi.fn(async () => ({ ok: true as const })),
    store: new MemoryStore(),
    exit: vi.fn(),
    reloadRow: vi.fn(),
  };
  shell = mountShell(root, deps);
});

afterEach(() => {
  shell.dispose();
  root.remove();
});

describe('fileira', () => {
  it('foco no indice 3 com sepIndex 2 desliza 370px', () => {
    shell.setRow(ROW);
    press(39);
    press(39);
    press(39);
    expect(root.querySelector<HTMLElement>('.trow')?.style.transform).toBe('translateX(-370px)');
  });

  it('item focado tem classe f, nome e linha de apoio', () => {
    shell.setRow(ROW);
    const focused = root.querySelector('.item.f');
    expect(focused?.querySelector('b')?.textContent).toBe('PS5');
    expect(focused?.querySelector('.lbl span')?.textContent).toBe('HDMI 1');
    press(39);
    press(39);
    const appItem = root.querySelector('.item.f');
    expect(appItem?.querySelector('.lbl span')?.textContent).toBe('Filmes e séries');
  });

  it('entrada mostra Ligado no HDMI n no destaque', () => {
    shell.setRow(ROW);
    expect(root.querySelector('.thero .tag')?.textContent).toBe('Ligado no HDMI 1');
    press(39);
    press(39);
    expect(root.querySelector('.thero .tag')?.textContent).toBe('');
  });

  it('sepIndex 0 nao cria separador', () => {
    shell.setRow({ items: [app('a', 'Netflix'), { kind: 'tv' }], sepIndex: 0 });
    expect(root.querySelector('.sep')).toBeNull();
    shell.setRow(ROW);
    expect(root.querySelectorAll('.sep')).toHaveLength(1);
  });

  it('onHueChange recebe o hue do item em foco', () => {
    const cb = vi.fn();
    shell.onHueChange(cb);
    shell.setRow(ROW);
    press(39);
    press(39);
    expect(cb).toHaveBeenLastCalledWith([229, 9, 20]);
  });

  it('OK abre o item e falha vira aviso', async () => {
    deps.open = vi.fn(async () => ({ ok: false as const, message: 'Falhou' }));
    shell.dispose();
    shell = mountShell(root, deps);
    shell.setRow(ROW);
    press(13);
    await Promise.resolve();
    await Promise.resolve();
    expect(root.querySelector('.thero .notice')?.textContent).toBe('Falhou');
  });

  it('Voltar sai do app', () => {
    shell.setRow(ROW);
    press(10009);
    expect(deps.exit).toHaveBeenCalled();
  });
});

describe('cartoes e todos os apps', () => {
  it('cria 4 cartoes Carregando e down foca o primeiro', () => {
    shell.setRow(ROW);
    expect(root.querySelectorAll('.tc')).toHaveLength(4);
    expect(root.querySelector('.tc .pending')?.textContent).toBe('Carregando…');
    press(40);
    expect(root.querySelectorAll('.tc')[0]?.classList.contains('f')).toBe(true);
    press(38);
    expect(root.querySelector('.tc.f')).toBeNull();
  });

  it('titulo de 200 caracteres recebe clamp', () => {
    expect(createCard('x'.repeat(200)).classList.contains('clamp')).toBe(true);
    expect(createCard('Cotações').classList.contains('clamp')).toBe(false);
  });
});

describe('nomear HDMI', () => {
  it('mostra as opcoes e OK salva via saveInputName', () => {
    const store = new MemoryStore();
    const onDone = vi.fn();
    const dialog = createNameDialog(3, store, onDone);
    const labels = Array.from(dialog.el.querySelectorAll('.opt')).map((n) => n.textContent);
    expect(labels).toEqual(['PS5', 'Chromecast', 'Notebook', 'PC', 'Outro']);
    dialog.handleKey('right');
    dialog.handleKey('right');
    dialog.handleKey('ok');
    expect(store.get<SavedInput>(inputKey(3))).toEqual({ name: 'Notebook', device: 'pc' });
    expect(onDone).toHaveBeenCalledWith(true);
  });

  it('porta sem nome abre o dialogo e salvar recarrega a fileira', () => {
    shell.setRow({ ...ROW, unnamedPorts: [3] });
    expect(root.querySelector('.dialog h2')?.textContent).toContain('HDMI 3');
    press(13);
    expect(deps.reloadRow).toHaveBeenCalled();
    expect(root.querySelector('.dialog')).toBeNull();
  });
});

describe('fix round 1', () => {
  it('setViews substitui o slot sem wrapper nem h2 extra', () => {
    const cards = createCardsView();
    const el = createCard('Meu cartao', document.createElement('div'));
    cards.setViews([el]);
    expect(cards.el.firstElementChild).toBe(el);
    expect(cards.el.querySelectorAll('h2')).toHaveLength(4);
    cards.focus(0);
    expect(el.classList.contains('f')).toBe(true);
  });

  it('Outro salva o nome Aparelho', () => {
    const store = new MemoryStore();
    const dialog = createNameDialog(2, store, vi.fn());
    for (let i = 0; i < 4; i++) dialog.handleKey('right');
    dialog.handleKey('ok');
    expect(store.get<SavedInput>(inputKey(2))).toEqual({ name: 'Aparelho', device: 'other' });
  });

  it('onNavigate dispara em tecla de navegacao e nao com overlay', () => {
    shell.setRow({ ...ROW, unnamedPorts: [1] });
    const cb = vi.fn();
    shell.onNavigate(cb);
    press(39);
    expect(cb).not.toHaveBeenCalled();
    press(10009);
    shell.setRow(ROW);
    press(39);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('notify exposto no shell', () => {
    shell.notify('Oi');
    expect(root.querySelector('.thero .notice')?.textContent).toBe('Oi');
  });
});

describe('icone com falha', () => {
  it('error na img troca pelo placeholder', () => {
    const withIcon = {
      ...(app('a', 'Prime Video') as Extract<Launchable, { kind: 'app' }>),
      iconPath: '/x/icon.png',
    };
    shell.setRow({ items: [withIcon, { kind: 'tv' }], sepIndex: 0 });
    const img = root.querySelector('.trow .app img') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    expect(root.querySelector('.trow .app img')).toBeNull();
    expect(root.querySelector('.trow .app .letter')?.textContent).toBe('P');
  });

  it('load com naturalWidth 0 tambem troca', () => {
    const withIcon = {
      ...(app('a', 'Prime Video') as Extract<Launchable, { kind: 'app' }>),
      iconPath: '/x/icon.png',
    };
    shell.setRow({ items: [withIcon, { kind: 'tv' }], sepIndex: 0 });
    const img = root.querySelector('.trow .app img') as HTMLImageElement;
    img.dispatchEvent(new Event('load'));
    expect(root.querySelector('.trow .app .letter')).not.toBeNull();
  });
});
