/** The browser only displays server-selected, manually reviewed catalogue entries. */
export type ResearchPilotInput = { avatar: boolean; fbx: boolean; rig: boolean; minutes: number };
export function buildResearchPilotRequest(input: ResearchPilotInput) {
  return {
    stages: input.avatar ? [["model-import"], ["avatar"]] : [["model-import"]],
    difficulty: input.avatar ? "intermediate" : "beginner", maxMinutes: input.minutes,
    internet: true, device: "computer", software: { unity: "6.0" },
    availableArtifacts: [...(input.fbx ? ["fbx-model"] : []), ...(input.rig ? ["humanoid-rig"] : [])],
  };
}
export type ResearchPilotResource = { id: string; title: string; url: string; source: string; reviewedAt: string; estimatedMinutes: number };
export type ResearchPilotResult = { resources: ResearchPilotResource[]; blockedStage: number | null };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function parseResearchPilotResult(value: unknown, stages: number): ResearchPilotResult | null {
  if (!record(value) || value.source !== "curated-catalogue" || value.liveSearch !== false || value.masteryVerified !== false || !Array.isArray(value.resources) || value.resources.length > stages) return null;
  const blocked = value.blockedStage;
  if (blocked === null ? value.resources.length !== stages : !Number.isInteger(blocked) || blocked !== value.resources.length || Number(blocked) >= stages) return null;
  const resources: ResearchPilotResource[] = [];
  for (const r of value.resources) {
    if (!record(r) || typeof r.id !== "string" || !/^[a-z0-9-]{1,80}$/.test(r.id) || typeof r.title !== "string" || !r.title.trim() || r.title.length > 240 || typeof r.source !== "string" || !r.source.trim() || r.source.length > 240 || typeof r.reviewedAt !== "string" || !Number.isFinite(Date.parse(r.reviewedAt)) || typeof r.estimatedMinutes !== "number" || !Number.isInteger(r.estimatedMinutes) || r.estimatedMinutes < 1 || r.estimatedMinutes > 240 || typeof r.url !== "string" || r.reviewKind !== "manual-documentation-review") return null;
    try {
      const url = new URL(r.url);
      if (url.protocol !== "https:" || url.hostname !== "docs.unity3d.com" || url.username || url.password || url.port || url.search || url.hash || !/^\/6000\.0\/Documentation\/Manual\/[a-zA-Z0-9-]+\.html$/.test(url.pathname)) return null;
    } catch { return null; }
    if (resources.some(x => x.id === r.id || x.url === r.url)) return null;
    resources.push({ id: r.id, title: r.title, url: r.url, source: r.source, reviewedAt: r.reviewedAt, estimatedMinutes: r.estimatedMinutes });
  }
  return { resources, blockedStage: blocked === null ? null : Number(blocked) };
}
/** Draft only: never send automatically, never claim a planned artifact was completed. */
export function draftResearchStudyPrompt(result: ResearchPilotResult): string | null {
  if (result.blockedStage !== null || !result.resources.length) return null;
  return `Help me adapt my StudyFlow around this curated Unity 6.0 documentation sequence: ${result.resources.map(r => r.title).join("; ")}. Ask me to confirm the prerequisites, preserve my existing roadmap and evidence, and propose practical exercises. The sequence is a plan, not proof of mastery. Do not invent links.`;
}
