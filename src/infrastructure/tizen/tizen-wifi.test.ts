import { afterEach, describe, expect, it, vi } from 'vitest';

import { TizenWifi } from './tizen-wifi';

const stub = (value: unknown) =>
  vi.stubGlobal('tizen', {
    systeminfo: { getPropertyValue: (_p: string, ok: (v: unknown) => void) => ok(value) },
  });

afterEach(() => vi.unstubAllGlobals());

describe('TizenWifi', () => {
  it('reads ssid and signal', async () => {
    stub({ ssid: 'Casa', signalStrength: 0.4 });
    expect(await new TizenWifi().read()).toEqual({ ssid: 'Casa', signal: 0.4 });
  });

  it('returns null when signal is not a number', async () => {
    stub({ ssid: 'Casa' });
    expect(await new TizenWifi().read()).toBeNull();
  });
});
