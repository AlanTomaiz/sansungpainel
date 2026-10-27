import type { RGB } from '@/domain/launchable';

import type { Quality } from './quality';
import { easeFactor, shouldDraw } from './throttle';

interface Blob {
  c: RGB | null;
  x: number;
  y: number;
  r: number;
  sx: number;
  sy: number;
  p: number;
}

export interface Background {
  setHue(rgb: RGB): void;
  stop(): void;
  fps(): number;
  pauseFor(ms: number): void;
}

const BLOBS: Blob[] = [
  { c: [92, 60, 255], x: 0.18, y: 0.2, r: 0.55, sx: 0.11, sy: 0.07, p: 0 },
  { c: [0, 194, 168], x: 0.82, y: 0.3, r: 0.5, sx: 0.08, sy: 0.1, p: 2 },
  { c: [255, 61, 139], x: 0.5, y: 0.85, r: 0.5, sx: 0.12, sy: 0.06, p: 4 },
  { c: null, x: 0.72, y: 0.12, r: 0.45, sx: 0.07, sy: 0.05, p: 1 },
];
const FPS_WINDOW_MS = 5000;
const HUE_EPSILON = 0.5;
const STRIDE = 7;
const DEFAULT_HUE: RGB = [140, 140, 160];

function buildPoints(cols: number, rows: number): Float32Array {
  const pts = new Float32Array((cols + 1) * (rows + 1) * STRIDE);
  let o = 0;
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
      const edge = x === 0 || y === 0 || x === cols || y === rows;
      pts[o++] = x / cols;
      pts[o++] = y / rows;
      pts[o++] = edge ? 0 : ((Math.random() - 0.5) * 0.7) / cols;
      pts[o++] = edge ? 0 : ((Math.random() - 0.5) * 0.7) / rows;
      pts[o++] = Math.random() * 6.28;
      pts[o++] = 0.25 + Math.random() * 0.35;
      pts[o++] = Math.random();
    }
  }
  return pts;
}

function colorAt(u: number, v: number, t: number, focus: RGB, out: number[]): void {
  let r = 10;
  let g = 9;
  let b = 18;
  for (const bl of BLOBS) {
    const cx = bl.x + Math.sin(t * 0.00015 + bl.p) * bl.sx;
    const cy = bl.y + Math.cos(t * 0.00012 + bl.p) * bl.sy;
    const dx = (u - cx) * 1.6;
    const dy = v - cy;
    const w = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / bl.r);
    const k = w * w * 0.9;
    const c = bl.c ?? focus;
    r += c[0] * k;
    g += c[1] * k;
    b += c[2] * k;
  }
  out[0] = Math.min(255, r);
  out[1] = Math.min(255, g);
  out[2] = Math.min(255, b);
}

function placePoints(
  pts: Float32Array,
  P: Float32Array,
  t: number,
  canvas: HTMLCanvasElement,
  q: Quality,
): void {
  const w = canvas.width;
  const h = canvas.height;
  for (let n = 0, s = 0, d = 0; n < P.length / 3; n++, s += STRIDE, d += 3) {
    const sp = pts[s + 5] as number;
    const ph = pts[s + 4] as number;
    P[d] =
      ((pts[s] as number) +
        (pts[s + 2] as number) +
        (Math.sin(t * 0.0004 * sp + ph) * 0.18) / q.cols) *
      w;
    P[d + 1] =
      ((pts[s + 1] as number) +
        (pts[s + 3] as number) +
        (Math.cos(t * 0.0005 * sp + ph) * 0.18) / q.rows) *
      h;
    P[d + 2] = pts[s + 6] as number;
  }
}

interface Painter {
  paint(t: number, focus: RGB): void;
}

function makePainter(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  q: Quality,
): Painter {
  const pts = buildPoints(q.cols, q.rows);
  const P = new Float32Array((q.cols + 1) * (q.rows + 1) * 3);
  const col = [0, 0, 0];

  const tri = (i: number, j: number, k: number, t: number, focus: RGB): void => {
    const w = canvas.width;
    const h = canvas.height;
    const u = ((P[i] as number) + (P[j] as number) + (P[k] as number)) / 3 / w;
    const v = ((P[i + 1] as number) + (P[j + 1] as number) + (P[k + 1] as number)) / 3 / h;
    colorAt(u, v, t, focus, col);
    const lit =
      0.72 +
      ((P[i + 2] as number) + (P[j + 2] as number) * 0.6 - (P[k + 2] as number) * 0.8) * 0.22 +
      Math.sin(t * 0.0006 + u * 6 + v * 4) * 0.05;
    const fill = `rgb(${((col[0] as number) * lit) | 0},${((col[1] as number) * lit) | 0},${((col[2] as number) * lit) | 0})`;
    ctx.fillStyle = fill;
    ctx.strokeStyle = fill;
    ctx.beginPath();
    ctx.moveTo(P[i] as number, P[i + 1] as number);
    ctx.lineTo(P[j] as number, P[j + 1] as number);
    ctx.lineTo(P[k] as number, P[k + 1] as number);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  return {
    paint(t, focus) {
      ctx.lineWidth = 0.6;
      placePoints(pts, P, t, canvas, q);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < q.rows; y++) {
        for (let x = 0; x < q.cols; x++) {
          const a = (y * (q.cols + 1) + x) * 3;
          const b = a + 3;
          const c = a + (q.cols + 1) * 3;
          const d = c + 3;
          if ((x + y) % 2) {
            tri(a, b, d, t, focus);
            tri(a, d, c, t, focus);
          } else {
            tri(a, b, c, t, focus);
            tri(b, d, c, t, focus);
          }
        }
      }
    },
  };
}

function easeToward(focus: RGB, target: RGB, k: number): void {
  for (let i = 0; i < 3; i++) {
    const diff = (target[i] as number) - (focus[i] as number);
    focus[i] =
      Math.abs(diff) < HUE_EPSILON ? (target[i] as number) : (focus[i] as number) + diff * k;
  }
}

function makeFpsMeter(): { record(now: number): void; read(): number } {
  const stamps: number[] = [];
  return {
    record(now) {
      stamps.push(now);
      while (stamps.length > 1 && now - (stamps[0] as number) > FPS_WINDOW_MS) stamps.shift();
    },
    read() {
      if (stamps.length < 2) return 0;
      const span = (stamps[stamps.length - 1] as number) - (stamps[0] as number);
      return ((stamps.length - 1) * 1000) / span;
    },
  };
}

const NOOP_BACKGROUND: Background = {
  setHue: () => undefined,
  stop: () => undefined,
  fps: () => 0,
  pauseFor: () => undefined,
};

function makeRepaintScheduler(
  run: () => void,
  pausedUntil: () => number,
): { request(): void; cancel(): void } {
  let raf = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const go = (): void => {
    timer = undefined;
    raf = requestAnimationFrame(() => {
      raf = 0;
      run();
    });
  };
  return {
    request() {
      if (raf || timer !== undefined) return;
      const wait = pausedUntil() - performance.now();
      if (wait > 0) timer = setTimeout(go, wait);
      else go();
    },
    cancel() {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      raf = 0;
      timer = undefined;
    },
  };
}

export function startBackground(canvas: HTMLCanvasElement, q: Quality): Background {
  const ctx = canvas.getContext('2d');
  if (!ctx) return NOOP_BACKGROUND;
  const painter = makePainter(ctx, canvas, q);
  const meter = makeFpsMeter();
  const focus: RGB = [...DEFAULT_HUE];
  const target: RGB = [...DEFAULT_HUE];
  const interval = 1000 / q.fps;
  let raf = 0;
  let last = 0;
  let prev = 0;
  let stopped = false;
  let pausedUntil = 0;

  const loop = (now: number): void => {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    if (now < pausedUntil) {
      prev = 0;
      return;
    }
    const gate = shouldDraw(now, last, interval);
    if (!gate.draw) return;
    last = gate.last;
    easeToward(focus, target, easeFactor(prev ? now - prev : interval));
    prev = now;
    painter.paint(now, focus);
    meter.record(now);
  };

  const paintStatic = (): void => {
    focus[0] = target[0];
    focus[1] = target[1];
    focus[2] = target[2];
    painter.paint(0, focus);
  };

  const repaint = makeRepaintScheduler(paintStatic, () => pausedUntil);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * q.scale);
  canvas.height = Math.round(r.height * q.scale);
  if (q.fps > 0) raf = requestAnimationFrame(loop);
  else paintStatic();

  return {
    setHue(rgb) {
      target[0] = rgb[0];
      target[1] = rgb[1];
      target[2] = rgb[2];
      if (q.fps === 0) repaint.request();
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      repaint.cancel();
    },
    fps: meter.read,
    pauseFor(ms) {
      pausedUntil = performance.now() + ms;
    },
  };
}
