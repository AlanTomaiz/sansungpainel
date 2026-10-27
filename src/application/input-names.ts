import type { InputDevice } from '@/domain/launchable';

import type { Store } from './ports';

export interface SavedInput {
  name: string;
  device: InputDevice;
}

export const inputKey = (port: number): string => `input-name:${port}`;

export function saveInputName(store: Store, port: number, device: InputDevice, name: string): void {
  store.set<SavedInput>(inputKey(port), { name, device });
}

export function inputDeviceFromName(name: string): InputDevice {
  const n = name.toLowerCase();
  if (/ps5|playstation/.test(n)) return 'ps5';
  if (/chromecast|\bcast\b/.test(n)) return 'cast';
  if (/\bpc\b|computador|notebook|laptop/.test(n)) return 'pc';
  return 'other';
}
