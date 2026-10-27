import type { PainelConfig } from '@/domain/config';
import {
  type AppItem,
  buildRow,
  type InputDevice,
  type InputItem,
  type Launchable,
} from '@/domain/launchable';

import { inputDeviceFromName, inputKey, type SavedInput } from './input-names';
import type { AppCatalog, InputSource, Store } from './ports';

export interface LoadRowDeps {
  apps: AppCatalog;
  inputs: InputSource;
  store: Store;
  config: PainelConfig;
}

const DEVICE_STYLE: Record<InputDevice, Pick<InputItem, 'bg' | 'hue' | 'meta'>> = {
  ps5: { bg: '#00439c', hue: [40, 100, 255], meta: 'PlayStation 5' },
  cast: { bg: '#3c4043', hue: [66, 133, 244], meta: 'Transmitir do PC ou do celular' },
  pc: { bg: '#3c4043', hue: [150, 165, 185], meta: 'Computador' },
  other: { bg: '#33333b', hue: [140, 140, 160], meta: 'Aparelho no HDMI' },
};

export async function loadRow(
  deps: LoadRowDeps,
): Promise<{ items: Launchable[]; sepIndex: number; unnamedPorts: number[] }> {
  const [installed, connected] = await Promise.all([
    deps.apps.installed(),
    deps.inputs.connected(),
  ]);
  const unnamedPorts: number[] = [];
  const inputs = connected.map(({ port, cecName }) => {
    const saved = deps.store.get<SavedInput>(inputKey(port));
    const name = cecName || saved?.name;
    if (!name) unnamedPorts.push(port);
    return toInput(
      port,
      name || `HDMI ${port}`,
      cecName || !saved?.name ? undefined : saved?.device,
    );
  });
  const iconById = new Map(installed.map((a) => [a.id, a.iconPath]));
  const favorites: AppItem[] = deps.config.favorites.map((f) => ({
    kind: 'app',
    appId: f.appId,
    name: f.name,
    iconPath: iconById.get(f.appId) ?? null,
    bg: f.bg,
    hue: f.hue,
    meta: f.meta,
  }));
  const { items, sepIndex } = buildRow(inputs, favorites, new Set(iconById.keys()));
  return { items, sepIndex, unnamedPorts };
}

function toInput(port: number, name: string, savedDevice?: InputDevice): InputItem {
  const device = savedDevice ?? inputDeviceFromName(name);
  return { kind: 'input', port, name, device, ...DEVICE_STYLE[device] };
}
