/**
 * Global animation tokens.
 *
 * One source of truth for duration + easing so every surface feels like the
 * same product. Keep durations in the 150–350ms band; anything slower reads
 * as lag, anything faster reads as a glitch.
 */

export const EASE = [0.25, 0.46, 0.45, 0.94] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  fast: 0.15,
  base: 0.22,
  slow: 0.32,
} as const;

/** Standard entrance: fade + small upward move. GPU-friendly (opacity/transform only). */
export const fadeUp = (delay = 0, distance = 12) => ({
  initial: { opacity: 0, y: distance },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: DURATION.slow, ease: EASE },
});

/** Scroll-triggered variant of the same entrance. */
export const revealUp = (delay = 0, distance = 14) => ({
  initial: { opacity: 0, y: distance },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { delay, duration: DURATION.slow, ease: EASE },
});

/** Shared press feedback for motion-driven buttons. */
export const pressable = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.fast, ease: EASE },
} as const;

/** Staggered list container. */
export const stagger = (gap = 0.05) => ({
  animate: { transition: { staggerChildren: gap } },
});
