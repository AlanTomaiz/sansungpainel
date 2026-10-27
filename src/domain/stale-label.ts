import { pad } from './format';

const startOfDay = (ms: number): number => new Date(ms).setHours(0, 0, 0, 0);

export function staleLabel(updatedAt: number, now: number): string {
  const d = new Date(updatedAt);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const dayGap = Math.round((startOfDay(now) - startOfDay(updatedAt)) / 86400000);
  if (dayGap <= 0) return `atualizado às ${time}`;
  if (dayGap === 1) return `atualizado ontem às ${time}`;
  return `atualizado em ${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${time}`;
}
