import { describe, expect, it } from 'vitest';

import type { Launchable } from '@/domain/launchable';
import { FakeAppCatalog, FakeInputSwitcher } from '@/infrastructure/fake/fakes';

import { openItem } from './open-item';
import type { AppCatalog } from './ports';

const input: Launchable = {
  kind: 'input',
  port: 2,
  name: 'PS5',
  device: 'ps5',
  bg: '#000',
  hue: [0, 0, 0],
  meta: '',
};
const app: Launchable = {
  kind: 'app',
  appId: 'yt',
  name: 'YouTube',
  iconPath: null,
  bg: '#000',
  hue: [0, 0, 0],
  meta: '',
};

const make = (error: Error | null = null) => ({
  switcher: new FakeInputSwitcher(error),
  apps: new FakeAppCatalog([]),
});

describe('openItem', () => {
  it('switches to the input port', async () => {
    const deps = make();
    expect(await openItem(input, deps)).toEqual({ ok: true });
    expect(deps.switcher.calls).toEqual([2]);
  });

  it('switches to tv', async () => {
    const deps = make();
    await openItem({ kind: 'tv' }, deps);
    expect(deps.switcher.calls).toEqual(['tv']);
  });

  it('maps ws-denied', async () => {
    const r = await openItem(input, make(new Error('ws-denied')));
    expect(r).toEqual({ ok: false, message: 'Permita o controle do painel na TV' });
  });

  it('maps ws-unreachable', async () => {
    const r = await openItem(input, make(new Error('ws-unreachable')));
    expect(r).toEqual({ ok: false, message: 'Não foi possível trocar de entrada' });
  });

  it('launches an app', async () => {
    const deps = make();
    expect(await openItem(app, deps)).toEqual({ ok: true });
    expect(deps.apps.launched).toEqual(['yt']);
  });

  it('uses an app-specific fallback when launch fails', async () => {
    const apps = { launch: () => Promise.reject(new Error('boom')) } as unknown as AppCatalog;
    const r = await openItem(app, { switcher: make().switcher, apps });
    expect(r).toEqual({ ok: false, message: 'Não foi possível abrir' });
  });

  it('uses the switch fallback for unknown switcher errors', async () => {
    const r = await openItem(input, make(new Error('boom')));
    expect(r).toEqual({ ok: false, message: 'Não foi possível trocar de entrada' });
  });
});
