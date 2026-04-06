import { useState, useCallback, useEffect } from "react";

interface Progress {
  selectedPath: string | null;
  completedSessions: string[];
}

const STORAGE_KEY = "career-compass-progress";

function loadProgress(): Progress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { selectedPath: null, completedSessions: [] };
}

function saveProgress(progress: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(loadProgress);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const selectPath = useCallback((pathId: string) => {
    setProgress((prev) => ({ ...prev, selectedPath: pathId }));
  }, []);

  const completeSession = useCallback((sessionId: string) => {
    setProgress((prev) => {
      if (prev.completedSessions.includes(sessionId)) return prev;
      return { ...prev, completedSessions: [...prev.completedSessions, sessionId] };
    });
  }, []);

  const isCompleted = useCallback(
    (sessionId: string) => progress.completedSessions.includes(sessionId),
    [progress.completedSessions]
  );

  const getPathProgress = useCallback(
    (pathId: string, allSessionIds: string[]) => {
      const completed = allSessionIds.filter((id) => progress.completedSessions.includes(id)).length;
      return { completed, total: allSessionIds.length, percent: allSessionIds.length > 0 ? Math.round((completed / allSessionIds.length) * 100) : 0 };
    },
    [progress.completedSessions]
  );

  const resetProgress = useCallback(() => {
    setProgress({ selectedPath: null, completedSessions: [] });
  }, []);

  return { progress, selectPath, completeSession, isCompleted, getPathProgress, resetProgress };
}
