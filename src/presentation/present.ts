import type { Launchable, RGB } from '@/domain/launchable';

export interface Presented {
  name: string;
  sub: string;
  meta: string;
  bg: string;
  hue: RGB;
  port: number | null;
}

export function present(item: Launchable): Presented {
  if (item.kind === 'input') {
    return { ...item, sub: `HDMI ${item.port}` };
  }
  if (item.kind === 'app') {
    return { ...item, sub: item.meta, port: null };
  }
  const meta = 'Antena digital';
  return { name: 'TV aberta', sub: meta, meta, bg: '#2a3a4f', hue: [0, 180, 216], port: null };
}
