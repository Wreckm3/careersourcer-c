/** Derive learning guidance from saved evidence, never from self-reported completion. */
export type MasteryDecision = "needs_practice" | "developing" | "criteria_met";
export type MasteryEvidence = { id: string; item_id: string; roadmap_revision: number; created_at: string };
export type MasteryAssessment = { id: string; evidence_id: string; roadmap_revision: number; created_at: string; decision: MasteryDecision; nextStep: string; remainingGaps: string[] };
export type MasteryLesson = { id: string; title: string; exercise: string; prerequisites: string[] };
export type MasteryStatus = "not_started" | "awaiting_assessment" | "needs_practice" | "developing" | "criteria_met";

function newestFirst(a: { created_at: string; id: string }, b: { created_at: string; id: string }) {
  return Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id);
}

export function deriveMastery(lessons: readonly MasteryLesson[], revision: number, evidence: readonly MasteryEvidence[], assessments: readonly MasteryAssessment[]) {
  const latestEvidence = new Map<string, MasteryEvidence>();
  for (const item of [...evidence].sort(newestFirst)) {
    if (item.roadmap_revision === revision && !latestEvidence.has(item.item_id)) latestEvidence.set(item.item_id, item);
  }
  const latestAssessment = new Map<string, MasteryAssessment>();
  for (const item of [...assessments].sort(newestFirst)) {
    if (item.roadmap_revision === revision && !latestAssessment.has(item.evidence_id)) latestAssessment.set(item.evidence_id, item);
  }
  const entries = lessons.map((lesson) => {
    const attempt = latestEvidence.get(lesson.id);
    const assessment = attempt ? latestAssessment.get(attempt.id) : undefined;
    const status: MasteryStatus = assessment?.decision ?? (attempt ? "awaiting_assessment" : "not_started");
    return { lesson, attempt, assessment, status };
  });
  const met = new Set(entries.filter((entry) => entry.status === "criteria_met").map((entry) => entry.lesson.id));
  const ready = entries.filter((entry) => entry.status !== "criteria_met" && entry.lesson.prerequisites.every((id) => met.has(id)));
  // Prefer addressing an identified gap, then independent practice, then review.
  const next = ready.find((entry) => entry.status === "needs_practice" || entry.status === "developing")
    ?? ready.find((entry) => entry.status === "not_started") ?? ready[0] ?? null;
  return { entries, met, next, blocked: entries.filter((entry) => entry.status !== "criteria_met" && !ready.includes(entry)) };
}
