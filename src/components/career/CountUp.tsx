import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Smoothly counts a number up on mount. Used for dashboard stats so totals
 * feel earned rather than pasted in.
 */
export function CountUp({
  value,
  duration = 0.9,
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, duration, reduced]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}
