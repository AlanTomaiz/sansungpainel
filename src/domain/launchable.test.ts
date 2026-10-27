import { describe, expect, it } from 'vitest';

import { type AppItem, buildRow, type InputItem } from './launchable';

const input: InputItem = {
  kind: 'input',
  port: 1,
  name: 'PS5',
  device: 'ps5',
  bg: '#000',
  hue: [0, 0, 0],
  meta: 'HDMI 1',
};
const app = (appId: string): AppItem => ({
  kind: 'app',
  appId,
  name: appId,
  iconPath: null,
  bg: '#000',
  hue: [0, 0, 0],
  meta: '',
});

describe('buildRow', () => {
  it('sem entradas: sepIndex 0 e primeiro item é app', () => {
    const row = buildRow([], [app('a')], new Set(['a']));
    expect(row.sepIndex).toBe(0);
    expect(row.items[0]?.kind).toBe('app');
  });

  it('omite favorito não instalado', () => {
    const row = buildRow([], [app('a'), app('b')], new Set(['a']));
    expect(row.items.filter((i) => i.kind === 'app')).toHaveLength(1);
  });

  it('ordem: entradas, favoritos, tv, all', () => {
    const row = buildRow([input], [app('a')], new Set(['a']));
    expect(row.items.map((i) => i.kind)).toEqual(['input', 'app', 'tv']);
    expect(row.sepIndex).toBe(1);
  });
});
