import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface AtlasActivationProps {
  loading: boolean;
  onReady: () => void;
}

const checkpoints = [
  "Synchronizing profile…",
  "Loading progress…",
  "Loading goals…",
  "Loading projects…",
  "Loading portfolio…",
  "Preparing today’s roadmap…",
];

/** A compact, skippable Atlas identity sequence built from original SVG geometry. */
export function AtlasActivation({ loading, onReady }: AtlasActivationProps) {
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (reducedMotion) {
      onReady();
      return;
    }
    const interval = window.setInterval(() => setStep((current) => Math.min(current + 1, checkpoints.length)), 150);
    const finish = window.setTimeout(onReady, 1050);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(finish);
    };
  }, [loading, onReady, reducedMotion]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/98 px-6">
      <div className="relative w-full max-w-sm text-center">
        <motion.div
          className="absolute inset-0 -z-10 rounded-full blur-3xl bg-primary/15"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1.1 }}
        />
        <motion.svg
          viewBox="0 0 160 160"
          className="mx-auto h-36 w-36 text-primary"
          fill="none"
          initial={{ opacity: 0, rotate: -18, scale: 0.75 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.45 }}
          aria-label="Atlas navigation beacon"
        >
          <motion.path d="M80 14 136 80 80 146 24 80 80 14Z" stroke="currentColor" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55 }} />
          <motion.path d="m80 42 23 38-23 38-23-38 23-38Z" stroke="currentColor" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.45 }} />
          <motion.path d="M80 0v42m0 76v42M0 80h57m46 0h57" stroke="currentColor" strokeWidth="1" opacity=".45" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.4 }} />
          <circle cx="80" cy="80" r="5" fill="currentColor" />
        </motion.svg>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.35em] text-primary">Atlas</p>
        <p className="mt-2 text-lg font-bold">{loading ? "Synchronizing your workspace…" : step >= checkpoints.length ? "Atlas ready." : checkpoints[step]}</p>
        <button onClick={onReady} className="mt-6 text-xs text-muted-foreground underline underline-offset-4">Skip</button>
      </div>
    </div>
  );
}
