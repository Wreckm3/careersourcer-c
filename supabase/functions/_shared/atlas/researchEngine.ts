/** Pure, no-network research foundation. Candidates must come from a trusted
 * server-side catalog/adapter, never from client claims or untrusted AI output.
 * URL screening is not availability, content, or safety verification. */
export type ResearchDifficulty = "beginner" | "intermediate" | "advanced";
export type ResourceCandidate = {
  id: string;
  title: string;
  url: string;
  source: string;
  topics: readonly string[];
  difficulty: ResearchDifficulty;
  minutes: number;
  access: "free" | "paid" | "unknown";
  offline: boolean;
  devices: readonly ("phone" | "computer")[];
  software: Readonly<Record<string, readonly string[]>>;
  requiresArtifacts: readonly string[];
  producesArtifacts: readonly string[];
  checkedAt: string;
};
export type ResearchContext = {
  topics: readonly string[];
  difficulty: ResearchDifficulty;
  maxMinutes: number;
  freeOnly: boolean;
  internet: boolean;
  device: "phone" | "computer";
  software: Readonly<Record<string, string>>;
  availableArtifacts: readonly string[];
};
export type ResearchPolicy = {
  allowedHosts: readonly string[];
  nowMs: number;
  maxAgeMs: number;
};
export type ResearchMatch = { resource: ResourceCandidate; score: number };
const difficultyRank: Record<ResearchDifficulty, number> = {
  beginner: 0, intermediate: 1, advanced: 2,
};
const normal = (value: string) => value.trim().toLowerCase();
const tokens = (values: readonly string[]) => new Set(values.map(normal).filter(Boolean));

/** Exact host allowlist, HTTPS, no credentials or non-default port.
 * Do not use this as an SSRF defense or follow arbitrary redirects. */
export function screenResourceUrl(value: string, allowedHosts: readonly string[]): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      allowedHosts.some((host) => normal(host) === url.hostname);
  } catch { return false; }
}

/** Hard-filter unknown/unsupported requirements before ranking. Version labels
 * are exact adapter-defined compatibility identifiers, not guessed semver ranges. */
export function rankResearchResources(candidates: readonly ResourceCandidate[], context: ResearchContext, policy: ResearchPolicy): ResearchMatch[] {
  if (!Number.isFinite(policy.nowMs) || !Number.isFinite(policy.maxAgeMs) || policy.maxAgeMs <= 0 ||
      !Number.isFinite(context.maxMinutes) || context.maxMinutes <= 0 ||
      !Object.prototype.hasOwnProperty.call(difficultyRank, context.difficulty)) return [];
  const wanted = tokens(context.topics);
  if (!wanted.size) return [];
  const available = tokens(context.availableArtifacts);
  const equipment = new Map(Object.entries(context.software).map(([name, version]) => [normal(name), normal(version)]));
  const eligible: ResearchMatch[] = [];
  for (const resource of candidates) {
    if (!resource.id.trim() || !resource.title.trim() || !resource.source.trim() || !screenResourceUrl(resource.url, policy.allowedHosts)) continue;
    const checked = Date.parse(resource.checkedAt);
    if (!Number.isFinite(checked) || checked > policy.nowMs || policy.nowMs - checked > policy.maxAgeMs) continue;
    if (!Number.isFinite(resource.minutes) || resource.minutes <= 0 || resource.minutes > context.maxMinutes) continue;
    if (!Object.prototype.hasOwnProperty.call(difficultyRank, resource.difficulty) || difficultyRank[resource.difficulty] > difficultyRank[context.difficulty]) continue;
    if (context.freeOnly && resource.access !== "free") continue;
    if (!context.internet && !resource.offline) continue;
    if (!resource.devices.includes(context.device)) continue;
    if (!Object.entries(resource.software).every(([name, versions]) => {
      const installed = equipment.get(normal(name));
      return !!installed && versions.some((version) => normal(version) === installed);
    })) continue;
    if (!resource.requiresArtifacts.every((artifact) => available.has(normal(artifact)))) continue;
    const topicMatches = [...tokens(resource.topics)].filter((topic) => wanted.has(topic)).length;
    if (!topicMatches) continue;
    const score = topicMatches * 100 + (resource.difficulty === context.difficulty ? 15 : 0) + (resource.access === "free" ? 10 : 0);
    eligible.push({ resource, score });
  }
  eligible.sort((a, b) => b.score - a.score || a.resource.minutes - b.resource.minutes || a.resource.id.localeCompare(b.resource.id));
  const ids = new Set<string>();
  const urls = new Set<string>();
  return eligible.filter(({ resource }) => {
    const url = new URL(resource.url); url.hash = "";
    if (ids.has(resource.id) || urls.has(url.href)) return false;
    ids.add(resource.id); urls.add(url.href); return true;
  });
}

/** Plan compatibility only: a planned artifact is not proof of mastery. */
export function planResourceChain(stages: readonly { topics: readonly string[]; candidates: readonly ResourceCandidate[] }[], context: ResearchContext, policy: ResearchPolicy): { selected: ResearchMatch[]; blockedStage: number | null } {
  const artifacts = tokens(context.availableArtifacts);
  const selected: ResearchMatch[] = [];
  const used = new Set<string>();
  // Bounded backtracking avoids choosing an early resource that blocks later stages.
  const maxStages = 8;
  if (stages.length > maxStages) return { selected, blockedStage: 0 };
  let attempts = 0;
  let best: ResearchMatch[] = [];
  function visit(index: number, available: Set<string>): boolean {
    if (selected.length > best.length) best = [...selected];
    if (index === stages.length) return true;
    if (++attempts > 256) return false;
    const stage = stages[index];
    const ranked = rankResearchResources(stage.candidates, { ...context, topics: stage.topics, availableArtifacts: [...available] }, policy).slice(0, 8);
    for (const match of ranked) {
      if (used.has(match.resource.id)) continue;
      selected.push(match); used.add(match.resource.id);
      const next = new Set([...available, ...tokens(match.resource.producesArtifacts)]);
      if (visit(index + 1, next)) return true;
      selected.pop(); used.delete(match.resource.id);
    }
    return false;
  }
  if (visit(0, artifacts)) return { selected, blockedStage: null };
  return { selected: best, blockedStage: best.length };
}
