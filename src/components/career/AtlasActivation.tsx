import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AtlasIcon } from "@/components/career/AtlasIcon";

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

/** A compact, skippable Atlas identity sequence. */
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
        <motion.div
          className="mx-auto h-36 w-36"
          initial={{ opacity: 0, rotate: -18, scale: 0.75 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.45 }}
        >
          <AtlasIcon className="h-full w-full" />
        </motion.div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.35em] text-primary">Atlas</p>
        <p className="mt-2 text-lg font-bold">{loading ? "Synchronizing your workspace…" : step >= checkpoints.length ? "Atlas ready." : checkpoints[step]}</p>
        <button onClick={onReady} className="mt-6 text-xs text-muted-foreground underline underline-offset-4">Skip</button>
      </div>
    </div>
  );
}
