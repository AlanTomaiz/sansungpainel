export interface Quality {
  cols: number;
  rows: number;
  scale: number;
  fps: number;
}

export function pickQuality(measuredFps: number): Quality {
  if (measuredFps >= 50) return { cols: 18, rows: 11, scale: 0.6, fps: 30 };
  if (measuredFps >= 25) return { cols: 12, rows: 7, scale: 0.5, fps: 24 };
  if (measuredFps >= 12) return { cols: 12, rows: 7, scale: 0.4, fps: 12 };
  return { cols: 12, rows: 7, scale: 0.4, fps: 0 };
}
