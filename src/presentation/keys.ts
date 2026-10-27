export type Key = 'left' | 'right' | 'up' | 'down' | 'ok' | 'back';

const BY_CODE: Record<number, Key> = {
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
  13: 'ok',
  10009: 'back',
};

const BY_NAME: Record<string, Key> = {
  ArrowLeft: 'left',
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowDown: 'down',
  Enter: 'ok',
  Escape: 'back',
  Backspace: 'back',
};

export function keyFromEvent(e: Pick<KeyboardEvent, 'keyCode'> & { key?: string }): Key | null {
  return BY_CODE[e.keyCode] ?? (e.key ? BY_NAME[e.key] : undefined) ?? null;
}
