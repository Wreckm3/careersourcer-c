import { planResourceChain, rankResearchResources, type ResearchContext, type ResourceCandidate } from "./researchEngine.ts";

/** Server-owned, manually reviewed documentation seed. No client-supplied URLs,
 * live search, network requests or AI. Review date means documentation was read,
 * not that a live HTTP health check or hands-on exercise was performed. */
const reviewedAt = "2026-11-27T00:00:00Z";
const maxAgeMs = 30 * 86400000;
const allowedHosts = ["docs.unity3d.com", "developer.mozilla.org", "docs.python.org"];
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
  {
    id: "mdn-basic-html", title: "Basic HTML syntax", source: "MDN Learn Web Development",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Basic_HTML_syntax",
    topics: ["web-development", "html", "html-syntax"], difficulty: "beginner", minutes: 45,
    access: "free", offline: false, devices: ["computer"], software: {},
    requiresArtifacts: ["web-editor-ready", "basic-file-skills"], producesArtifacts: ["basic-html-page"], checkedAt: reviewedAt,
  },
  {
    id: "mdn-css-introduction", title: "What is CSS?", source: "MDN Learn Web Development",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/What_is_CSS",
    topics: ["web-development", "css", "css-basics"], difficulty: "beginner", minutes: 35,
    access: "free", offline: false, devices: ["computer"], software: {},
    requiresArtifacts: ["web-editor-ready", "basic-file-skills", "html-familiarity"], producesArtifacts: ["css-syntax-practice"], checkedAt: reviewedAt,
  },
  {
    id: "python-314-introduction", title: "An Informal Introduction to Python", source: "Python 3.14 Documentation",
    url: "https://docs.python.org/3.14/tutorial/introduction.html",
    topics: ["python", "programming-basics", "python-syntax"], difficulty: "beginner", minutes: 60,
    access: "free", offline: false, devices: ["computer"], software: { python: ["3.14"] },
    requiresArtifacts: ["python-interpreter-ready", "basic-programming-knowledge"], producesArtifacts: ["python-expression-practice"], checkedAt: reviewedAt,
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
function computeCuratedChain(stages: readonly (readonly string[])[], context: ResearchContext, nowMs: number) {
  const result = planResourceChain(stages.map(topics => ({ topics, candidates: catalog })), context, policy(nowMs));
  return { resourceIds: result.selected.map(match => match.resource.id), blockedStage: result.blockedStage };
}
/** Resolve IDs selected by a trusted server process, not arbitrary supplied URLs.
 * Does not authorize access or establish that a learner has prerequisite artifacts. */
export function resolveCuratedResource(id: string, nowMs: number) {
  const record = catalog.find(entry => entry.id === id);
  if (!record || !isCurrent(record, nowMs)) return null;
  return { id: record.id, title: record.title, url: record.url, source: record.source,
    reviewedAt: record.checkedAt, estimatedMinutes: record.minutes, reviewKind: "manual-documentation-review" as const };
}


type CuratedPlan = ReturnType<typeof computeCuratedChain>;
const normalize = (s: string) => s.trim().toLowerCase();
const sorted = (values: readonly string[]) => [...new Set(values.map(normalize))].sort();
const knownTopics = new Set(catalog.flatMap(r => r.topics.map(normalize)));
const knownArtifacts = new Set(catalog.flatMap(r => [...r.requiresArtifacts, ...r.producesArtifacts].map(normalize)));
const knownSoftware = new Map<string, Set<string>>();
for (const item of catalog) for (const [name, versions] of Object.entries(item.software)) {
  const key = normalize(name);
  const all = knownSoftware.get(key) ?? new Set<string>();
  for (const version of versions) all.add(normalize(version));
  knownSoftware.set(key, all);
}
function isCurrent(resource: ResourceCandidate, nowMs: number): boolean {
  const checked = Date.parse(resource.checkedAt);
  return Number.isFinite(nowMs) && Number.isFinite(checked) && checked <= nowMs && nowMs - checked <= maxAgeMs;
}
/** Only normalized, known catalogue constraints can become shared cache keys.
 * Preserve stage order, omit identities and free text; unknown inputs bypass caching.
 * Eligibility fingerprint invalidates both positive and empty cached plans at review boundaries. */
function planCacheKey(stages: readonly (readonly string[])[], context: ResearchContext, nowMs: number): string | null {
  if (!Number.isFinite(nowMs) || !Number.isInteger(context.maxMinutes) || context.maxMinutes < 1 || context.maxMinutes > 240 || stages.length < 1 || stages.length > 8) return null;
  if (!["beginner", "intermediate", "advanced"].includes(context.difficulty) || !["computer", "phone"].includes(context.device) || typeof context.freeOnly !== "boolean" || typeof context.internet !== "boolean") return null;
  const topics = stages.map(sorted);
  const artifacts = sorted(context.availableArtifacts);
  const software = Object.entries(context.software).map(([key, value]) => [normalize(key), normalize(value)] as const).sort(([a], [b]) => a.localeCompare(b));
  if (topics.some(stage => !stage.length || stage.length > 8 || stage.some(t => !knownTopics.has(t))) || artifacts.some(a => !knownArtifacts.has(a)) || software.some(([k,v]) => !knownSoftware.get(k)?.has(v)) || new Set(software.map(([key]) => key)).size !== software.length) return null;
  return JSON.stringify([catalog.map(r => isCurrent(r, nowMs)), topics, artifacts, software, context.difficulty, context.maxMinutes, context.freeOnly, context.internet, context.device]);
}

/** Per-isolate LRU cache. No durable storage or network/API costs.
 * Authorization remains outside this helper and must run on every request. */
export function createCuratedPlanCache(capacity = 128, ttlMs = 5 * 60_000) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 256 || !Number.isFinite(ttlMs) || ttlMs <= 0 || ttlMs > 60 * 60_000) throw new RangeError("Invalid research cache bounds");
  const entries = new Map<string, { at: number; value: CuratedPlan }>();
  const copy = (v: CuratedPlan): CuratedPlan => ({ resourceIds: [...v.resourceIds], blockedStage: v.blockedStage });
  return {
    plan(stages: readonly (readonly string[])[], context: ResearchContext, nowMs: number): CuratedPlan {
      const key = planCacheKey(stages, context, nowMs);
      if (key === null) return computeCuratedChain(stages, context, nowMs);
      const existing = entries.get(key);
      if (existing) {
        entries.delete(key);
        if (nowMs >= existing.at && nowMs - existing.at < ttlMs) {
          entries.set(key, existing);
          return copy(existing.value);
        }
      }
      const result = computeCuratedChain(stages, context, nowMs);
      if (entries.size >= capacity) {
        const oldest = entries.keys().next();
        if (!oldest.done) entries.delete(oldest.value);
      }
      entries.set(key, { at: nowMs, value: copy(result) });
      return result;
    },
    get size() { return entries.size; },
  };
}
const curatedPlanCache = createCuratedPlanCache();
export function planCuratedChain(stages: readonly (readonly string[])[], context: ResearchContext, nowMs: number) {
  return curatedPlanCache.plan(stages, context, nowMs);
}
