import type { InputSource } from '@/application/ports';

const POLL_MS = 5000;

function readVideoSources(): Promise<TizenVideoSourceItem[]> {
  return new Promise((resolve, reject) => {
    tizen.systeminfo.getPropertyValue(
      'VIDEOSOURCE',
      (v) => resolve((v as { connected?: TizenVideoSourceItem[] }).connected ?? []),
      reject,
    );
  });
}

export class TizenInputSource implements InputSource {
  async connected(): Promise<{ port: number; cecName: string | null }[]> {
    const sources = await readVideoSources();
    return sources.filter((s) => s.type === 'HDMI').map((s) => ({ port: s.number, cecName: null }));
  }

  onChange(cb: () => void): void {
    let last: string | null = null;
    const tick = async (): Promise<void> => {
      try {
        const sig = signature(await this.connected());
        if (last !== null && sig !== last) cb();
        last = sig;
      } catch {
        /* keep last signature */
      }
    };
    try {
      tizen.systeminfo.addPropertyValueChangeListener('VIDEOSOURCE', () => void tick());
    } catch {
      /* polling below covers it */
    }
    void tick();
    setInterval(() => void tick(), POLL_MS);
  }
}

const signature = (ports: { port: number }[]): string =>
  ports
    .map((p) => p.port)
    .sort((a, b) => a - b)
    .join(',');
