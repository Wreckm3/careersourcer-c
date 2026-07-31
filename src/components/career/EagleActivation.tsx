import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * Eagle-inspired Focus Mode activation.
 *
 * A single pure-SVG wing-spread + gold light sweep. No images, no heavy
 * libraries — it mounts, plays for ~1.6s, then unmounts itself so it never
 * costs anything for the rest of the session. Honours reduced-motion.
 */

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

interface Props {
  /** Accent colour of the branch — the sweep picks it up. */
  color: string;
  /** Called once the animation has finished (or immediately if reduced-motion). */
  onDone: () => void;
  label?: string;
}

export function EagleActivation({ color, onDone, label = "Focus Mode" }: Props) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const ms = reduced ? 250 : 1750;
    const t = setTimeout(() => {
      setVisible(false);
      onDone();
    }, ms);
    return () => clearTimeout(t);
  }, [reduced, onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {/* radial glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 45%, ${color}22, transparent 60%)`,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
          />

          <motion.svg
            width="220"
            height="120"
            viewBox="0 0 220 120"
            fill="none"
            className="relative"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            {/* left wing */}
            <motion.path
              d="M108 62 C86 44, 58 34, 22 36 C50 46, 74 56, 100 72"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: reduced ? 0.2 : 0.85, ease: EASE }}
            />
            {/* right wing */}
            <motion.path
              d="M112 62 C134 44, 162 34, 198 36 C170 46, 146 56, 120 72"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: reduced ? 0.2 : 0.85, ease: EASE }}
            />
            {/* body + head */}
            <motion.path
              d="M110 58 L110 92 M110 58 L118 50"
              stroke={color}
              strokeWidth="2.6"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.25, duration: reduced ? 0.2 : 0.5, ease: EASE }}
            />
            {/* tail feathers */}
            <motion.path
              d="M110 92 L102 108 M110 92 L110 110 M110 92 L118 108"
              stroke={color}
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity={0.75}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.45, duration: reduced ? 0.2 : 0.45, ease: EASE }}
            />
          </motion.svg>

          {/* light sweep */}
          {!reduced && (
            <motion.div
              className="absolute h-px w-[70vw] max-w-xl"
              style={{
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              }}
              initial={{ opacity: 0, scaleX: 0.2 }}
              animate={{ opacity: [0, 1, 0], scaleX: [0.2, 1, 1.1] }}
              transition={{ delay: 0.5, duration: 1, ease: EASE }}
            />
          )}

          <motion.p
            className="relative mt-8 text-[11px] font-semibold uppercase tracking-[0.4em] text-muted-foreground"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, ease: EASE }}
          >
            {label}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
