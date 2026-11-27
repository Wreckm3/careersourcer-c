/** The browser only displays server-selected, manually reviewed catalogue entries. */
export type ResearchPilotInput =
  | { goal?: "unity"; avatar: boolean; fbx: boolean; rig: boolean; minutes: number }
  | { goal: "web"; css: boolean; editor: boolean; files: boolean; html: boolean; minutes: number }
  | { goal: "python"; interpreter: boolean; basics: boolean; minutes: number };
export function buildResearchPilotRequest(input: ResearchPilotInput) {
  const common = { maxMinutes: input.minutes, internet: true, device: "computer" };
  if (input.goal === "web") return {
    ...common, stages: input.css ? [["html-syntax"], ["css-basics"]] : [["html-syntax"]],
    difficulty: "beginner", software: {},
    availableArtifacts: [...(input.editor ? ["web-editor-ready"] : []), ...(input.files ? ["basic-file-skills"] : []), ...(input.html ? ["html-familiarity"] : [])],
  };
  if (input.goal === "python") return {
    ...common, stages: [["python-syntax"]], difficulty: "beginner", software: { python: "3.14" },
    availableArtifacts: [...(input.interpreter ? ["python-interpreter-ready"] : []), ...(input.basics ? ["basic-programming-knowledge"] : [])],
  };
  return {
    stages: input.avatar ? [["model-import"], ["avatar"]] : [["model-import"]],
    difficulty: input.avatar ? "intermediate" : "beginner", maxMinutes: input.minutes,
    internet: true, device: "computer", software: { unity: "6.0" },
    availableArtifacts: [...(input.fbx ? ["fbx-model"] : []), ...(input.rig ? ["humanoid-rig"] : [])],
  };
}
export type ResearchPilotResource = { id: string; title: string; url: string; source: string; reviewedAt: string; estimatedMinutes: number };
export type ResearchPilotResult = { resources: ResearchPilotResource[]; blockedStage: number | null };
// Exact ID-to-URL binding: never turn an arbitrary URL into a clickable resource.
const reviewedUrls = new Map([
  ["unity-6000-model-import", "https://docs.unity3d.com/6000.0/Documentation/Manual/ImportingModelFiles.html"],
  ["unity-6000-humanoid-avatar", "https://docs.unity3d.com/6000.0/Documentation/Manual/ConfiguringtheAvatar.html"],
  ["mdn-basic-html", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Basic_HTML_syntax"],
  ["mdn-css-introduction", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/What_is_CSS"],
  ["python-314-introduction", "https://docs.python.org/3.14/tutorial/introduction.html"],
]);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function parseResearchPilotResult(value: unknown, stages: number): ResearchPilotResult | null {
  if (!Number.isInteger(stages) || stages < 1 || stages > 8 || !record(value) || value.source !== "curated-catalogue" || value.liveSearch !== false || value.masteryVerified !== false || !Array.isArray(value.resources) || value.resources.length > stages) return null;
  const blocked = value.blockedStage;
  if (blocked === null ? value.resources.length !== stages : !Number.isInteger(blocked) || blocked !== value.resources.length || Number(blocked) >= stages) return null;
  const resources: ResearchPilotResource[] = [];
  for (const r of value.resources) {
    if (!record(r) || typeof r.id !== "string" || !/^[a-z0-9-]{1,80}$/.test(r.id) || typeof r.title !== "string" || !r.title.trim() || r.title.length > 240 || typeof r.source !== "string" || !r.source.trim() || r.source.length > 240 || typeof r.reviewedAt !== "string" || !Number.isFinite(Date.parse(r.reviewedAt)) || typeof r.estimatedMinutes !== "number" || !Number.isInteger(r.estimatedMinutes) || r.estimatedMinutes < 1 || r.estimatedMinutes > 240 || typeof r.url !== "string" || r.reviewKind !== "manual-documentation-review") return null;
    if (reviewedUrls.get(r.id) !== r.url) return null;
    if (resources.some(x => x.id === r.id || x.url === r.url)) return null;
    resources.push({ id: r.id, title: r.title, url: r.url, source: r.source, reviewedAt: r.reviewedAt, estimatedMinutes: r.estimatedMinutes });
  }
  return { resources, blockedStage: blocked === null ? null : Number(blocked) };
}
/** Draft only: never send automatically, never claim a planned artifact was completed. */
export function draftResearchStudyPrompt(result: ResearchPilotResult): string | null {
  if (result.blockedStage !== null || !result.resources.length) return null;
  return `Help me adapt my StudyFlow around this curated documentation sequence: ${result.resources.map(r => r.title).join("; ")}. Ask me to confirm the prerequisites, preserve my existing roadmap and evidence, and propose practical exercises. The sequence is a plan, not proof of mastery. Do not invent links.`;
}
