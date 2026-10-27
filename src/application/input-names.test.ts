import { describe, expect, it } from 'vitest';

import { MemoryStore } from '@/infrastructure/fake/fakes';

import { inputDeviceFromName, inputKey, saveInputName } from './input-names';

describe('inputDeviceFromName', () => {
  it('detects devices', () => {
    expect(inputDeviceFromName('PS5')).toBe('ps5');
    expect(inputDeviceFromName('Chromecast')).toBe('cast');
    expect(inputDeviceFromName('Meu PC')).toBe('pc');
    expect(inputDeviceFromName('Soundbar')).toBe('other');
    expect(inputDeviceFromName('Broadcast')).toBe('other');
  });
});

describe('saveInputName', () => {
  it('persists name and device by port', () => {
    const store = new MemoryStore();
    saveInputName(store, 2, 'pc', 'Desktop');
    expect(store.get(inputKey(2))).toEqual({ name: 'Desktop', device: 'pc' });
  });
});
