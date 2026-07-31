import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Session timer for Focus Mode.
 *
 * Counts elapsed seconds while running, supports pause/resume, and is driven by
 * timestamps (not tick accumulation) so background-tab throttling can't drift it.
 */
export function useSessionTimer(autoStart = false) {
  const [running, setRunning] = useState(autoStart);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(autoStart ? Date.now() : null);
  const banked = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const base = startedAt.current ? Date.now() - startedAt.current : 0;
      setElapsed(Math.floor((banked.current + base) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    if (startedAt.current === null) startedAt.current = Date.now();
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (startedAt.current !== null) {
      banked.current += Date.now() - startedAt.current;
      startedAt.current = null;
    }
    setRunning(false);
  }, []);

  const resume = useCallback(() => {
    startedAt.current = Date.now();
    setRunning(true);
  }, []);

  const reset = useCallback(() => {
    banked.current = 0;
    startedAt.current = null;
    setElapsed(0);
    setRunning(false);
  }, []);

  return { elapsed, running, start, pause, resume, reset };
}

export function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
