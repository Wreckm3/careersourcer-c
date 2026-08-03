import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { DURATION, EASE } from "@/lib/motion";

/**
 * Tasteful scroll reveal: fade + small upward move, once per element.
 * Falls back to a plain wrapper when the user prefers reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  distance = 14,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const reduced = useReducedMotion();
  const Comp = motion[as];

  if (reduced) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay, duration: DURATION.slow, ease: EASE }}
    >
      {children}
    </Comp>
  );
}
