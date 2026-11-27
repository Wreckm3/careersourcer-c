import { isMentorStyle, MENTOR_STYLES, type MentorStyle } from "../../../supabase/functions/_shared/atlas/mentorStyle.ts";
export { MENTOR_STYLES, isMentorStyle, type MentorStyle };

export const MENTOR_STYLE_LABELS: Record<MentorStyle, string> = {
  adaptive: "Adaptive",
  ruthless: "Ruthless Mentor",
  supportive: "Supportive Coach",
  strategic: "Strategic Advisor",
  technical: "Technical Expert",
};
export const MENTOR_STYLE_DESCRIPTIONS: Record<MentorStyle, string> = {
  adaptive: "Balanced, practical guidance.",
  ruthless: "Direct feedback; challenge the idea, never the person.",
  supportive: "Patient encouragement and manageable steps.",
  strategic: "Priorities, trade-offs and long-term decisions.",
  technical: "Precise explanations and reproducible steps.",
};

type StyleStorage = Pick<Storage, "getItem" | "setItem">;
const keyFor = (userId: string) => `careersourcer:atlas:mentor-style:v1:${userId}`;

/** Only a fixed style ID is persisted, separately per signed-in account. */
export function readMentorStyle(storage: StyleStorage, userId: string): MentorStyle {
  if (!userId) return "adaptive";
  try {
    const value = storage.getItem(keyFor(userId));
    return isMentorStyle(value) ? value : "adaptive";
  } catch { return "adaptive"; }
}

export function writeMentorStyle(storage: StyleStorage, userId: string, value: unknown): boolean {
  if (!userId || !isMentorStyle(value)) return false;
  try { storage.setItem(keyFor(userId), value); return true; }
  catch { return false; }
}
