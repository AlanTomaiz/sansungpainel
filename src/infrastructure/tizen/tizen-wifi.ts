import type { WifiStatus } from '@/application/ports';

export class TizenWifi implements WifiStatus {
  read(): Promise<{ ssid: string; signal: number } | null> {
    return new Promise((resolve) => {
      tizen.systeminfo.getPropertyValue(
        'WIFI_NETWORK',
        (v) => {
          const w = v as { ssid?: string; signalStrength?: number };
          const ok = w.ssid && typeof w.signalStrength === 'number';
          resolve(ok ? { ssid: w.ssid as string, signal: w.signalStrength as number } : null);
        },
        () => resolve(null),
      );
    });
  }
}
