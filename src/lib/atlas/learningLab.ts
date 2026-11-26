/** Learner-authored practice is evidence, not an automated assessment. */
export const LAB_FIELDS = [
  { key: "approach", title: "Your approach", maxLength: 600, prompt: "What are you trying to do, and what steps or tools will you use?" },
  { key: "result", title: "What you produced", maxLength: 1400, prompt: "Describe your actual work, include a small example or link to your own artifact." },
  { key: "verification", title: "How you checked it", maxLength: 1000, prompt: "What did you test, compare or observe against the lesson criteria? Include failures too." },
  { key: "reflection", title: "What you learned", maxLength: 600, prompt: "What changed in your understanding, what remains unclear, and what would you try next?" },
] as const;

export type LabField = typeof LAB_FIELDS[number]["key"];
export type LabDraft = Record<LabField, string>;
export const emptyLabDraft = (): LabDraft => ({ approach: "", result: "", verification: "", reflection: "" });

export function formatLabEvidence(draft: LabDraft): string | null {
  const sections: string[] = [];
  for (const field of LAB_FIELDS) {
    const answer = draft[field.key];
    if (typeof answer !== "string" || !answer.trim() || answer.trim().length > field.maxLength) return null;
    sections.push(`${field.title}:\n${answer.trim()}`);
  }
  const evidence = ["Learning Lab practice (learner-reported; not independently verified)", ...sections].join("\n\n");
  return evidence.length <= 4000 ? evidence : null;
}
