import { planResourceChain, rankResearchResources, type ResearchContext, type ResourceCandidate } from "./researchEngine.ts";

/** Server-owned, manually reviewed documentation seed. No client-supplied URLs,
 * live search, network requests or AI. Review date means documentation was read,
 * not that a live HTTP health check or hands-on exercise was performed. */
const reviewedAt = "2026-11-27T00:00:00Z";
const maxAgeMs = 30 * 86400000;
const allowedHosts = ["docs.unity3d.com"];
const catalog: readonly ResourceCandidate[] = [
  {
    id: "unity-6000-model-import", title: "Importing a model", source: "Unity 6.0 Manual",
    url: "https://docs.unity3d.com/6000.0/Documentation/Manual/ImportingModelFiles.html",
    topics: ["unity", "fbx", "model-import"], difficulty: "beginner", minutes: 25,
    access: "free", offline: false, devices: ["computer"], software: { unity: ["6.0", "6000.0"] },
    requiresArtifacts: ["fbx-model"], producesArtifacts: ["unity-imported-model"], checkedAt: reviewedAt,
  },
  {
    id: "unity-6000-humanoid-avatar", title: "Importing a model with humanoid animations", source: "Unity 6.0 Manual",
    url: "https://docs.unity3d.com/6000.0/Documentation/Manual/ConfiguringtheAvatar.html",
    topics: ["unity", "humanoid", "avatar", "animation"], difficulty: "intermediate", minutes: 40,
    access: "free", offline: false, devices: ["computer"], software: { unity: ["6.0", "6000.0"] },
    requiresArtifacts: ["unity-imported-model", "humanoid-rig"], producesArtifacts: ["unity-configured-avatar"], checkedAt: reviewedAt,
  },
];

const policy = (nowMs: number) => ({ allowedHosts, nowMs, maxAgeMs });
/** Only call on the server with validated context. Outputs are planning suggestions,
 * not proof of mastery. Time and difficulty are editorial estimates. */
export function searchCuratedResources(context: ResearchContext, nowMs: number) {
  return rankResearchResources(catalog, context, policy(nowMs)).map(({ resource, score }) => ({
    id: resource.id, score, title: resource.title, estimatedMinutes: resource.minutes,
  }));
}
export function planCuratedChain(stages: readonly (readonly string[])[], context: ResearchContext, nowMs: number) {
  const result = planResourceChain(stages.map(topics => ({ topics, candidates: catalog })), context, policy(nowMs));
  return { resourceIds: result.selected.map(match => match.resource.id), blockedStage: result.blockedStage };
}
/** Resolve IDs selected by a trusted server process, not arbitrary supplied URLs.
 * Does not authorize access or establish that a learner has prerequisite artifacts. */
export function resolveCuratedResource(id: string, nowMs: number) {
  if (!Number.isFinite(nowMs) || nowMs < Date.parse(reviewedAt) || nowMs - Date.parse(reviewedAt) > maxAgeMs) return null;
  const record = catalog.find(entry => entry.id === id);
  if (!record) return null;
  return { id: record.id, title: record.title, url: record.url, source: record.source,
    reviewedAt: record.checkedAt, estimatedMinutes: record.minutes, reviewKind: "manual-documentation-review" as const };
}
