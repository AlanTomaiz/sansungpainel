const TOLERANCE_MS = 1;
const FRAME_MS = 16.67;
const EASE = 0.04;

export function shouldDraw(
  now: number,
  last: number,
  interval: number,
): { draw: boolean; last: number } {
  if (now - last < interval - TOLERANCE_MS) return { draw: false, last };
  return { draw: true, last: Math.max(last + interval, now - interval) };
}

export function easeFactor(dtMs: number): number {
  return 1 - Math.pow(1 - EASE, dtMs / FRAME_MS);
}
