// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { attachAutoScroll } from './auto-scroll';

const animation = { pause: vi.fn(), play: vi.fn(), cancel: vi.fn() };
const animate = vi.fn(() => animation);
const stops: (() => void)[] = [];
const attach = (v: HTMLElement, c: HTMLElement): (() => void) => {
  const stop = attachAutoScroll(v, c);
  stops.push(stop);
  return stop;
};

function setup(scrollHeight: number, clientHeight: number) {
  const viewport = document.createElement('div');
  const content = document.createElement('div');
  viewport.appendChild(content);
  Object.defineProperty(viewport, 'scrollHeight', { value: scrollHeight });
  Object.defineProperty(viewport, 'clientHeight', { value: clientHeight });
  (content as unknown as { animate: typeof animate }).animate = animate;
  return { viewport, content };
}

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => vi.clearAllMocks());

afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  setHidden(false);
  vi.unstubAllGlobals();
});

describe('attachAutoScroll', () => {
  it('não anima quando cabe', () => {
    const { viewport, content } = setup(200, 300);
    attach(viewport, content);
    expect(animate).not.toHaveBeenCalled();
  });

  it('anima só transform, linear e infinito, com pausas nas pontas', () => {
    const { viewport, content } = setup(400, 300);
    attach(viewport, content);
    expect(animate).toHaveBeenCalledWith(
      [
        { transform: 'translateY(0)', offset: 0 },
        { transform: 'translateY(0)', offset: 3000 / 11000 },
        { transform: 'translateY(-100px)', offset: 1 - 3000 / 11000 },
        { transform: 'translateY(-100px)', offset: 1 },
      ],
      { duration: 11000, iterations: Infinity, easing: 'linear' },
    );
  });

  it('pausa quando o documento fica oculto e retoma ao voltar', () => {
    const { viewport, content } = setup(400, 300);
    attach(viewport, content);
    setHidden(true);
    expect(animation.pause).toHaveBeenCalled();
    setHidden(false);
    expect(animation.play).toHaveBeenCalled();
  });

  it('prefers-reduced-motion deixa parado', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { viewport, content } = setup(400, 300);
    attach(viewport, content);
    expect(animate).not.toHaveBeenCalled();
  });

  it('stop cancela a animação e solta o listener', () => {
    const { viewport, content } = setup(400, 300);
    const stop = attach(viewport, content);
    stop();
    expect(animation.cancel).toHaveBeenCalled();
    setHidden(true);
    expect(animation.pause).not.toHaveBeenCalled();
  });
});
