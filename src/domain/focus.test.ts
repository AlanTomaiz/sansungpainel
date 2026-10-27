import { describe, expect, it } from 'vitest';

import { focusAfterRowChange, type FocusState, reduceFocus } from './focus';
import type { Launchable } from './launchable';

const hdmi = (port: number): Launchable => ({
  kind: 'input',
  port,
  name: `HDMI ${port}`,
  device: 'other',
  bg: '#000',
  hue: [0, 0, 0],
  meta: '',
});
const app = (appId: string): Launchable => ({
  kind: 'app',
  appId,
  name: appId,
  iconPath: null,
  bg: '#000',
  hue: [0, 0, 0],
  meta: '',
});

describe('focus', () => {
  it('right 50x numa fileira de 9 termina em 8', () => {
    let s: FocusState = { zone: 'row', row: 0, card: 0 };
    for (let i = 0; i < 50; i++) s = reduceFocus(s, 'right', 9, 4);
    expect(s.row).toBe(8);
  });

  it('down vai para cards mantendo row; up volta', () => {
    const down = reduceFocus({ zone: 'row', row: 3, card: 0 }, 'down', 9, 4);
    expect(down).toMatchObject({ zone: 'cards', row: 3 });
    expect(reduceFocus(down, 'up', 9, 4).zone).toBe('row');
  });

  it('clamp após encolher a fileira quando o item sumiu', () => {
    const old = [hdmi(1), hdmi(2), hdmi(3), app('a'), app('b'), app('c'), app('d'), app('e')];
    const next = [hdmi(1), app('a'), app('b'), app('c'), app('d'), { kind: 'tv' } as Launchable];
    expect(focusAfterRowChange({ zone: 'row', row: 7, card: 0 }, old, next).row).toBe(5);
  });

  it('o foco segue o item quando a fileira muda', () => {
    const old = [hdmi(1), app('a'), app('b')];
    const next = [hdmi(1), hdmi(2), app('a'), app('b')];
    expect(focusAfterRowChange({ zone: 'row', row: 2, card: 0 }, old, next).row).toBe(3);
    expect(focusAfterRowChange({ zone: 'row', row: 0, card: 0 }, old, next).row).toBe(0);
  });

  it('segue o item também com foco nos cards, preservando o card', () => {
    const old = [hdmi(1), app('a')];
    const next = [hdmi(2), hdmi(1), app('a')];
    expect(focusAfterRowChange({ zone: 'cards', row: 1, card: 2 }, old, next)).toEqual({
      zone: 'cards',
      row: 2,
      card: 2,
    });
  });

  it('left/right nos cards movem card com clamp nas pontas', () => {
    let s: FocusState = { zone: 'cards', row: 3, card: 0 };
    s = reduceFocus(s, 'left', 9, 3);
    expect(s.card).toBe(0);
    s = reduceFocus(s, 'right', 9, 3);
    expect(s.card).toBe(1);
    for (let i = 0; i < 5; i++) s = reduceFocus(s, 'right', 9, 3);
    expect(s.card).toBe(2);
  });

  it('up de qualquer card volta à fileira mantendo row', () => {
    const s = reduceFocus({ zone: 'cards', row: 3, card: 2 }, 'up', 9, 4);
    expect(s).toMatchObject({ zone: 'row', row: 3 });
  });

  it('down nos cards não faz nada', () => {
    const s: FocusState = { zone: 'cards', row: 3, card: 1 };
    expect(reduceFocus(s, 'down', 9, 4)).toEqual(s);
  });

  it('down da fileira sem cards permanece na fileira', () => {
    const s: FocusState = { zone: 'row', row: 3, card: 0 };
    expect(reduceFocus(s, 'down', 9, 0)).toEqual(s);
  });
});
