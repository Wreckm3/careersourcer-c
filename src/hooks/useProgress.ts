import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Progress {
  selectedPath: string | null;
  completedSessions: string[];
  streakCurrent: number;
  streakLastDate: string | null;
}

const STORAGE_KEY = "career-compass-progress";
const LEGACY_STREAK_KEY = "career-compass-streak";

const empty: Progress = {
  selectedPath: null,
  completedSessions: [],
  streakCurrent: 0,
  streakLastDate: null,
};

function loadLocal(): Progress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const p = JSON.parse(stored);
      // merge legacy streak if present
      try {
        const legacy = localStorage.getItem(LEGACY_STREAK_KEY);
        if (legacy && p.streakCurrent == null) {
          const l = JSON.parse(legacy);
          p.streakCurrent = l.current ?? 0;
          p.streakLastDate = l.lastDate ?? null;
        }
      } catch {}
      return { ...empty, ...p };
    }
  } catch {}
  return empty;
}

function saveLocal(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function useProgress() {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<Progress>(loadLocal);
  const hydratedFor = useRef<string | null>(null);

  // Load from cloud when user logs in; migrate local -> cloud if user has none
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      hydratedFor.current = null;
      setProgress(loadLocal());
      return;
    }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;

    (async () => {
      const { data } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        const cloud: Progress = {
          selectedPath: data.selected_path,
          completedSessions: Array.isArray(data.completed_sessions)
            ? (data.completed_sessions as string[])
            : [],
          streakCurrent: data.streak_current ?? 0,
          streakLastDate: data.streak_last_date,
        };
        // Merge any local progress that isn't in cloud yet
        const local = loadLocal();
        const merged: Progress = {
          selectedPath: cloud.selectedPath ?? local.selectedPath,
          completedSessions: Array.from(
            new Set([...cloud.completedSessions, ...local.completedSessions])
          ),
          streakCurrent: Math.max(cloud.streakCurrent, local.streakCurrent),
          streakLastDate: cloud.streakLastDate ?? local.streakLastDate,
        };
        setProgress(merged);
        if (merged.completedSessions.length !== cloud.completedSessions.length) {
          await persistCloud(user.id, merged);
        }
      } else {
        // first-time login: seed cloud with local
        const local = loadLocal();
        setProgress(local);
        await persistCloud(user.id, local);
      }
    })();
  }, [user, authLoading]);

  // Persist on every change
  useEffect(() => {
    saveLocal(progress);
    if (user) {
      persistCloud(user.id, progress).catch(() => {});
    }
  }, [progress, user]);

  const selectPath = useCallback((pathId: string) => {
    setProgress((prev) => ({ ...prev, selectedPath: pathId }));
  }, []);

  const completeSession = useCallback((sessionId: string) => {
    setProgress((prev) => {
      if (prev.completedSessions.includes(sessionId)) return prev;
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let streakCurrent = prev.streakCurrent;
      let streakLastDate = prev.streakLastDate;
      if (streakLastDate !== today) {
        streakCurrent = streakLastDate === yesterday ? streakCurrent + 1 : 1;
        streakLastDate = today;
      }
      return {
        ...prev,
        completedSessions: [...prev.completedSessions, sessionId],
        streakCurrent,
        streakLastDate,
      };
    });
  }, []);

  const isCompleted = useCallback(
    (sessionId: string) => progress.completedSessions.includes(sessionId),
    [progress.completedSessions]
  );

  const getPathProgress = useCallback(
    (_pathId: string, allSessionIds: string[]) => {
      const completed = allSessionIds.filter((id) =>
        progress.completedSessions.includes(id)
      ).length;
      return {
        completed,
        total: allSessionIds.length,
        percent:
          allSessionIds.length > 0
            ? Math.round((completed / allSessionIds.length) * 100)
            : 0,
      };
    },
    [progress.completedSessions]
  );

  const resetProgress = useCallback(() => {
    setProgress(empty);
  }, []);

  return {
    progress,
    selectPath,
    completeSession,
    isCompleted,
    getPathProgress,
    resetProgress,
  };
}

async function persistCloud(userId: string, p: Progress) {
  await supabase.from("user_progress").upsert(
    {
      user_id: userId,
      selected_path: p.selectedPath,
      completed_sessions: p.completedSessions,
      streak_current: p.streakCurrent,
      streak_last_date: p.streakLastDate,
    },
    { onConflict: "user_id" }
  );
}
