import { useEffect, useState } from 'react';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animates from 0 to `value` only once `active` flips true (paired with
// useReveal so the count-up plays when the stat scrolls into view).
export const useCountUp = (value: number, active: boolean, durationMs = 900): number => {
  const [display, setDisplay] = useState(prefersReducedMotion() ? value : 0);

  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, value]);

  return display;
};
