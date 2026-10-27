const SPEED_PX_PER_S = 20;
const HOLD_MS = 3000;

export interface ScrollPlan {
  distance: number;
  durationMs: number;
  holdFraction: number;
}

export function planScroll(scrollHeight: number, clientHeight: number): ScrollPlan | null {
  const distance = scrollHeight - clientHeight;
  if (distance <= 0) return null;
  const durationMs = Math.round((distance / SPEED_PX_PER_S) * 1000) + 2 * HOLD_MS;
  return { distance, durationMs, holdFraction: HOLD_MS / durationMs };
}
