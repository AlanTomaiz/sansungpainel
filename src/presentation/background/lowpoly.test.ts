// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { startBackground } from './lowpoly';

describe('startBackground', () => {
  it('strokes triangles with lineWidth 0.6 after the canvas resize', () => {
    const widths: number[] = [];
    const ctx = {
      lineWidth: 1,
      fillStyle: '',
      strokeStyle: '',
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(() => widths.push(ctx.lineWidth)),
    };
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    Object.defineProperty(canvas, 'width', {
      get: () => 100,
      set: () => {
        ctx.lineWidth = 1;
      },
    });
    Object.defineProperty(canvas, 'height', { get: () => 50, set: () => undefined });

    startBackground(canvas, { cols: 2, rows: 2, scale: 1, fps: 0 }).stop();

    expect(widths.length).toBeGreaterThan(0);
    expect(widths.every((w) => w === 0.6)).toBe(true);
  });

  it('pauseFor suspends painting until the window ends', () => {
    const clear = vi.fn();
    const ctx = {
      lineWidth: 1,
      fillStyle: '',
      strokeStyle: '',
      clearRect: clear,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    };
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    let frame: ((t: number) => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      frame = cb;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    let clock = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const bg = startBackground(canvas, { cols: 2, rows: 2, scale: 1, fps: 30 });
    const tick = (t: number): void => {
      clock = t;
      frame?.(t);
    };

    tick(1000);
    expect(clear).toHaveBeenCalledTimes(1);
    bg.pauseFor(450);
    tick(1100);
    tick(1300);
    expect(clear).toHaveBeenCalledTimes(1);
    tick(1500);
    expect(clear).toHaveBeenCalledTimes(2);
    bg.stop();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('pause and hue', () => {
    const mkCtx = (fills: string[]) => {
      const ctx = {
        lineWidth: 1,
        strokeStyle: '',
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        set fillStyle(v: string) {
          fills.push(v);
        },
      };
      return ctx;
    };
    const setup = (fps: number, fills: string[]) => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const canvas = document.createElement('canvas');
      vi.spyOn(canvas, 'getContext').mockReturnValue(
        mkCtx(fills) as unknown as CanvasRenderingContext2D,
      );
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        width: 100,
        height: 50,
      } as DOMRect);
      Object.defineProperty(canvas, 'width', { get: () => 100, set: () => undefined });
      Object.defineProperty(canvas, 'height', { get: () => 50, set: () => undefined });
      const frames: ((t: number) => void)[] = [];
      vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
        frames.push(cb);
        return frames.length;
      });
      vi.stubGlobal('cancelAnimationFrame', () => undefined);
      const clock = { now: 1000 };
      vi.spyOn(performance, 'now').mockImplementation(() => clock.now);
      const bg = startBackground(canvas, { cols: 2, rows: 2, scale: 1, fps });
      const tick = (t: number): void => {
        clock.now = t;
        frames.splice(0).forEach((f) => f(t));
      };
      return { bg, tick, clock, frames };
    };

    it('hue step after a pause equals one normal frame step', () => {
      const a: string[] = [];
      const ctrl = setup(30, a);
      ctrl.tick(1000);
      ctrl.tick(1466.67);
      ctrl.bg.setHue([255, 0, 0]);
      a.length = 0;
      ctrl.tick(1500);
      const control = a.slice();
      ctrl.bg.stop();

      const b: string[] = [];
      const paused = setup(30, b);
      paused.tick(1000);
      paused.bg.setHue([255, 0, 0]);
      paused.bg.pauseFor(450);
      paused.tick(1100);
      b.length = 0;
      paused.tick(1500);
      paused.bg.stop();

      expect(control.length).toBeGreaterThan(0);
      expect(b).toEqual(control);
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('static tier defers the hue repaint until the pause ends and stop cancels it', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const fills: string[] = [];
      const t = setup(0, fills);
      t.bg.pauseFor(450);
      const before = fills.length;
      t.bg.setHue([255, 0, 0]);
      t.tick(1100);
      expect(fills.length).toBe(before);
      t.clock.now = 1450;
      vi.advanceTimersByTime(450);
      t.tick(1500);
      expect(fills.length).toBeGreaterThan(before);

      const again = fills.length;
      t.bg.pauseFor(450);
      t.bg.setHue([0, 255, 0]);
      t.bg.stop();
      vi.advanceTimersByTime(1000);
      t.tick(3000);
      expect(fills.length).toBe(again);
      vi.useRealTimers();
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });
  });
});
