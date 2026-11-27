import { useCallback, useEffect, useState } from "react";
import { isMentorStyle, readMentorStyle, writeMentorStyle, type MentorStyle } from "@/lib/atlas/mentorStyle";

export function useAtlasMentorStyle(userId: string | undefined) {
  const [preference, setPreference] = useState<{ userId: string; style: MentorStyle; persisted: boolean } | null>(null);
  useEffect(() => {
    if (!userId) { setPreference(null); return; }
    let style: MentorStyle = "adaptive";
    try { style = readMentorStyle(window.localStorage, userId); } catch { /* Storage can be blocked. */ }
    setPreference({ userId, style, persisted: true });
  }, [userId]);

  const setStyle = useCallback((style: MentorStyle) => {
    if (!userId || !isMentorStyle(style)) return;
    let persisted = false;
    try { persisted = writeMentorStyle(window.localStorage, userId, style); } catch { /* Session-only fallback. */ }
    setPreference({ userId, style, persisted });
  }, [userId]);

  // Never expose a previous account's selection while the next account loads.
  const current = preference?.userId === userId ? preference : null;
  return { style: current?.style ?? "adaptive" as MentorStyle, setStyle, persisted: current?.persisted ?? true };
}
