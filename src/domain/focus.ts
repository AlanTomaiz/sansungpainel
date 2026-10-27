import type { Launchable } from './launchable';

export type FocusState = { zone: 'row' | 'cards'; row: number; card: number };
type Key = 'left' | 'right' | 'up' | 'down';

const clamp = (n: number, max: number): number => Math.max(0, Math.min(n, max));

export function reduceFocus(
  s: FocusState,
  key: Key,
  rowLen: number,
  cardCount: number,
): FocusState {
  if (s.zone === 'row') {
    if (key === 'left') return { ...s, row: clamp(s.row - 1, rowLen - 1) };
    if (key === 'right') return { ...s, row: clamp(s.row + 1, rowLen - 1) };
    if (key === 'down' && cardCount > 0) return { ...s, zone: 'cards', card: 0 };
    return s;
  }
  if (key === 'left') return { ...s, card: clamp(s.card - 1, cardCount - 1) };
  if (key === 'right') return { ...s, card: clamp(s.card + 1, cardCount - 1) };
  if (key === 'up') return { ...s, zone: 'row' };
  return s;
}

const identity = (item: Launchable): string =>
  item.kind === 'input' ? `input:${item.port}` : item.kind === 'app' ? `app:${item.appId}` : 'tv';

export function focusAfterRowChange(
  s: FocusState,
  oldItems: Launchable[],
  newItems: Launchable[],
): FocusState {
  const previous = oldItems[s.row];
  const moved = previous ? newItems.findIndex((i) => identity(i) === identity(previous)) : -1;
  return { ...s, row: moved >= 0 ? moved : clamp(s.row, newItems.length - 1) };
}
