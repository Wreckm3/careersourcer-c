/** Fixed, server-owned delivery styles; never interpolate user-provided instructions. */
export const MENTOR_STYLES = ["adaptive", "ruthless", "supportive", "strategic", "technical"] as const;
export type MentorStyle = typeof MENTOR_STYLES[number];

export function isMentorStyle(value: unknown): value is MentorStyle {
  return typeof value === "string" && MENTOR_STYLES.some(style => style === value);
}

const guidance: Record<MentorStyle, string> = {
  adaptive: "",
  ruthless: "Be candid and direct. Challenge assumptions and weak plans using evidence; explain the trade-off and offer a smaller achievable alternative. Never insult, shame, threaten, or pressure the learner.",
  supportive: "Use patient, reassuring language. Acknowledge specific demonstrated progress, then break the next step into a manageable action. Be honest about gaps; do not give false reassurance.",
  strategic: "Prioritize decisions, dependencies, opportunity costs, and milestones. Distinguish assumptions from verified facts and give a practical next decision rather than promising outcomes.",
  technical: "Explain mechanisms precisely at the learner's level. Prefer small reproducible examples, verification steps, and clear trade-offs. Do not invent specifications, code results, or prerequisites.",
};

export function mentorStyleInstruction(value: unknown): string {
  if (!isMentorStyle(value) || value === "adaptive") return "";
  return `Delivery preference only: ${guidance[value]} All safety, accuracy, learner constraints, evidence standards, and core mentoring instructions remain authoritative. For sensitive or distressed learners, prioritize compassionate, nonjudgmental support regardless of style.`;
}
