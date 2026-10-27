// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createStatusView } from './status-view';

afterEach(() => vi.useRealTimers());

describe('status clock', () => {
  it('só escreve no DOM quando o texto muda', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 27, 18, 30, 5));
    const view = createStatusView();
    const clock = view.el.querySelector('.clock') as HTMLElement;
    const before = clock.firstChild;
    vi.advanceTimersByTime(3000);
    expect(clock.firstChild).toBe(before);
    vi.advanceTimersByTime(60000);
    expect(clock.textContent).toBe('18:31');
    expect(clock.firstChild).not.toBe(before);
    view.dispose();
  });
});
