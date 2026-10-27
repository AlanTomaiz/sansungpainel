import { planScroll } from '@/domain/auto-scroll';

const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function attachAutoScroll(viewport: HTMLElement, content: HTMLElement): () => void {
  const plan = planScroll(viewport.scrollHeight, viewport.clientHeight);
  if (!plan || reducedMotion() || typeof content.animate !== 'function') return () => undefined;
  const top = `translateY(0)`;
  const bottom = `translateY(-${plan.distance}px)`;
  const animation = content.animate(
    [
      { transform: top, offset: 0 },
      { transform: top, offset: plan.holdFraction },
      { transform: bottom, offset: 1 - plan.holdFraction },
      { transform: bottom, offset: 1 },
    ],
    { duration: plan.durationMs, iterations: Infinity, easing: 'linear' },
  );
  const onVisibility = (): void => (document.hidden ? animation.pause() : animation.play());
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    animation.cancel();
  };
}
