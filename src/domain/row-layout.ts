const ITEM_STEP_PX = 112;
const SEPARATOR_PX = 34;

export function rowOffsetPx(index: number, sepIndex: number): number {
  return index * ITEM_STEP_PX + (sepIndex > 0 && index >= sepIndex ? SEPARATOR_PX : 0);
}
