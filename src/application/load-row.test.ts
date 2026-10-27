import { describe, expect, it } from 'vitest';

import type { PainelConfig } from '@/domain/config';
import { FakeAppCatalog, FakeInputSource, MemoryStore } from '@/infrastructure/fake/fakes';

import { saveInputName } from './input-names';
import { loadRow } from './load-row';

const fav = (appId: string) => ({
  appId,
  name: appId,
  bg: '#111',
  hue: [1, 2, 3] as [number, number, number],
  meta: 'm',
});
const config = { favorites: [fav('yt'), fav('nf')] } as PainelConfig;

const deps = (ports: { port: number; cecName: string | null }[], store = new MemoryStore()) => ({
  apps: new FakeAppCatalog([{ id: 'yt', iconPath: '/yt.png' }]),
  inputs: new FakeInputSource(ports),
  store,
  config,
});

describe('loadRow', () => {
  it('uses cecName when present', async () => {
    const r = await loadRow(deps([{ port: 1, cecName: 'PS5' }]));
    expect(r.items[0]).toMatchObject({
      kind: 'input',
      port: 1,
      name: 'PS5',
      device: 'ps5',
      bg: '#00439c',
    });
    expect(r.unnamedPorts).toEqual([]);
  });

  it('falls back to the stored name', async () => {
    const store = new MemoryStore();
    saveInputName(store, 2, 'pc', 'Desktop');
    const r = await loadRow(deps([{ port: 2, cecName: null }], store));
    expect(r.items[0]).toMatchObject({ name: 'Desktop', device: 'pc', meta: 'Computador' });
    expect(r.unnamedPorts).toEqual([]);
  });

  it('marks unnamed ports as HDMI n', async () => {
    const r = await loadRow(deps([{ port: 3, cecName: null }]));
    expect(r.items[0]).toMatchObject({ name: 'HDMI 3', device: 'other', meta: 'Aparelho no HDMI' });
    expect(r.unnamedPorts).toEqual([3]);
  });

  it('builds installed favorites with icon, then tv', async () => {
    const r = await loadRow(deps([{ port: 1, cecName: 'PS5' }]));
    expect(r.sepIndex).toBe(1);
    expect(r.items[1]).toMatchObject({ kind: 'app', appId: 'yt', iconPath: '/yt.png' });
    expect(r.items.map((i) => i.kind)).toEqual(['input', 'app', 'tv']);
  });

  it('treats empty names as missing', async () => {
    const store = new MemoryStore();
    saveInputName(store, 4, 'pc', '');
    const r = await loadRow(deps([{ port: 4, cecName: '' }], store));
    expect(r.items[0]).toMatchObject({ name: 'HDMI 4' });
    expect(r.unnamedPorts).toEqual([4]);
  });
});
