import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TizenInputSource } from './tizen-inputs';

let connected: { type: string; number: number; signal: string }[];

beforeEach(() => {
  vi.useFakeTimers();
  connected = [{ type: 'HDMI', number: 1, signal: 'ok' }];
  vi.stubGlobal('tizen', {
    systeminfo: {
      getPropertyValue: (_p: string, ok: (v: unknown) => void) => ok({ connected }),
      addPropertyValueChangeListener: () => {
        throw new Error('unsupported');
      },
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('TizenInputSource polling fallback', () => {
  it('calls back only when the connected ports change', async () => {
    const cb = vi.fn();
    new TizenInputSource().onChange(cb);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(cb).not.toHaveBeenCalled();
    connected = [...connected, { type: 'HDMI', number: 2, signal: 'ok' }];
    await vi.advanceTimersByTimeAsync(5000);
    expect(cb).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe('TizenInputSource with a working listener', () => {
  it('still polls when the listener never fires', async () => {
    let listener: (() => void) | null = null;
    vi.stubGlobal('tizen', {
      systeminfo: {
        getPropertyValue: (_p: string, ok: (v: unknown) => void) => ok({ connected }),
        addPropertyValueChangeListener: (_p: string, l: () => void) => {
          listener = l;
        },
      },
    });
    const cb = vi.fn();
    new TizenInputSource().onChange(cb);
    await vi.advanceTimersByTimeAsync(0);
    connected = [...connected, { type: 'HDMI', number: 2, signal: 'ok' }];
    await vi.advanceTimersByTimeAsync(5000);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(listener).not.toBeNull();
  });

  it('listener event calls back once, and the next poll does not repeat it', async () => {
    let listener: () => void = () => undefined;
    vi.stubGlobal('tizen', {
      systeminfo: {
        getPropertyValue: (_p: string, ok: (v: unknown) => void) => ok({ connected }),
        addPropertyValueChangeListener: (_p: string, l: () => void) => {
          listener = l;
        },
      },
    });
    const cb = vi.fn();
    new TizenInputSource().onChange(cb);
    await vi.advanceTimersByTimeAsync(0);
    connected = [...connected, { type: 'HDMI', number: 2, signal: 'ok' }];
    listener();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
