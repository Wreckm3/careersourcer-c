import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useContext,
  createContext,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Progress {
  selectedPath: string | null;
  completedSessions: string[];
  streakCurrent: number;
  streakLastDate: string | null;
  streakDays: string[];
}

const STORAGE_KEY = "career-compass-progress";
const LEGACY_STREAK_KEY = "career-compass-streak";

const empty: Progress = {
  selectedPath: null,
  completedSessions: [],
  streakCurrent: 0,
  streakLastDate: null,
  streakDays: [],
};

function loadLocal(): Progress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const p = JSON.parse(stored);
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

async function persistCloud(userId: string, p: Progress) {
  await supabase.from("user_progress").upsert(
    {
      user_id: userId,
      selected_path: p.selectedPath,
      completed_sessions: p.completedSessions,
      streak_current: p.streakCurrent,
      streak_last_date: p.streakLastDate,
      streak_days: p.streakDays,
    } as never,
    { onConflict: "user_id" }
  );
}

interface ProgressContextValue {
  progress: Progress;
  selectPath: (pathId: string) => void;
  completeSession: (sessionId: string) => void;
  isCompleted: (sessionId: string) => boolean;
  getPathProgress: (
    pathId: string,
    allSessionIds: string[]
  ) => { completed: number; total: number; percent: number };
  resetProgress: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<Progress>(loadLocal);
  const hydratedFor = useRef<string | null>(null);
  const isHydrated = useRef<boolean>(true); // local-only is always hydrated

  // Hydrate from cloud when user changes
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      hydratedFor.current = null;
      isHydrated.current = true;
      setProgress(loadLocal());
      return;
    }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    isHydrated.current = false;

    (async () => {
      const { data } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const local = loadLocal();
      if (data) {
        const d = data as typeof data & { streak_days?: string[] | null };
        const cloud: Progress = {
          selectedPath: d.selected_path,
          completedSessions: Array.isArray(d.completed_sessions)
            ? (d.completed_sessions as string[])
            : [],
          streakCurrent: d.streak_current ?? 0,
          streakLastDate: d.streak_last_date,
          streakDays: Array.isArray(d.streak_days) ? d.streak_days : [],
        };
        const merged: Progress = {
          selectedPath: cloud.selectedPath ?? local.selectedPath,
          completedSessions: Array.from(
            new Set([...cloud.completedSessions, ...local.completedSessions])
          ),
          streakCurrent: Math.max(cloud.streakCurrent, local.streakCurrent),
          streakLastDate: cloud.streakLastDate ?? local.streakLastDate,
          streakDays: Array.from(
            new Set([...cloud.streakDays, ...local.streakDays])
          ).sort(),
        };
        setProgress(merged);
        isHydrated.current = true;
        if (
          merged.completedSessions.length !== cloud.completedSessions.length ||
          merged.selectedPath !== cloud.selectedPath
        ) {
          persistCloud(user.id, merged).catch(() => {});
        }
      } else {
        setProgress(local);
        isHydrated.current = true;
        // seed cloud only if local has something worth saving
        if (
          local.selectedPath ||
          local.completedSessions.length > 0 ||
          local.streakCurrent > 0
        ) {
          persistCloud(user.id, local).catch(() => {});
        }
      }
    })();
  }, [user, authLoading]);

  // Persist on change — but only after hydration completes
  useEffect(() => {
    saveLocal(progress);
    if (user && isHydrated.current) {
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
      const streakDays = prev.streakDays.includes(today)
        ? prev.streakDays
        : [...prev.streakDays, today].sort().slice(-60);
      return {
        ...prev,
        completedSessions: [...prev.completedSessions, sessionId],
        streakCurrent,
        streakLastDate,
        streakDays,
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

  return (
    <ProgressContext.Provider
      value={{
        progress,
        selectPath,
        completeSession,
        isCompleted,
        getPathProgress,
        resetProgress,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside ProgressProvider");
  return ctx;
}
