// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import type { Launchable } from '@/domain/launchable';

import { createRowView } from './row-view';

const app = (id: string): Launchable => ({
  kind: 'app',
  appId: id,
  name: id,
  iconPath: null,
  bg: '#000',
  hue: [1, 2, 3],
  meta: '',
});

describe('createRowView', () => {
  const build = () => {
    const view = createRowView();
    document.body.appendChild(view.el);
    view.setItems([app('a'), app('b'), app('c'), app('d')], 2);
    return view;
  };

  it('desloca apenas os itens e o divisor depois do foco, via transform', () => {
    const view = build();
    view.focus(1, true);
    const kids = Array.from(view.el.querySelectorAll<HTMLElement>('.trow > *'));
    const shifts = kids.map((k) => k.style.transform);
    expect(shifts[0]).toBe('');
    expect(shifts[1]).toBe('');
    expect(shifts[2]).toMatch(/^translateX\([1-9]\d*px\)$/);
    expect(shifts[3]).toBe(shifts[2]);
    expect(shifts[4]).toBe(shifts[2]);
  });

  it('foco no ultimo item nao desloca ninguem e marca .f', () => {
    const view = build();
    view.focus(3, true);
    const items = view.el.querySelectorAll<HTMLElement>('.item');
    expect(items[3]?.classList.contains('f')).toBe(true);
    expect(Array.from(items).every((i) => i.style.transform === '')).toBe(true);
  });

  it('mantem o deslocamento da fileira inalterado', () => {
    const view = build();
    view.focus(2, true);
    expect((view.el.querySelector('.trow') as HTMLElement).style.transform).toBe(
      'translateX(-258px)',
    );
  });

  it('refaz a medicao dos rotulos quando as fontes terminam de carregar', async () => {
    let width = 100;
    const spy = vi
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(() => width);
    Object.defineProperty(document, 'fonts', {
      value: { ready: Promise.resolve() },
      configurable: true,
    });
    const view = build();
    view.focus(1, true);
    const shift = (): string =>
      (view.el.querySelectorAll('.trow > *')[2] as HTMLElement).style.transform;
    expect(shift()).toBe('translateX(216px)');
    width = 200;
    await Promise.resolve();
    await Promise.resolve();
    expect(shift()).toBe('translateX(316px)');
    spy.mockRestore();
    Reflect.deleteProperty(document, 'fonts');
  });
});
