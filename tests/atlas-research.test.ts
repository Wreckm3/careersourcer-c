import assert from "node:assert/strict";
import { test } from "node:test";
import { screenResourceUrl, rankResearchResources, planResourceChain, type ResourceCandidate, type ResearchContext, type ResearchPolicy } from "../src/lib/atlas/researchEngine.ts";
const policy: ResearchPolicy = { allowedHosts: ["example.com"], nowMs: Date.parse("2026-11-27T12:00:00Z"), maxAgeMs: 86400000 };
const ctx: ResearchContext = { topics: ["blender"], difficulty: "beginner", maxMinutes: 60, freeOnly: true, internet: true, device: "computer", software: { Blender: "4.5", Unity: "6" }, availableArtifacts: [] };
const candidate: ResourceCandidate = { id: "model", title: "Model a character", url: "https://example.com/model", source: "Fixture only", topics: ["blender"], difficulty: "beginner", minutes: 30, access: "free", offline: false, devices: ["computer"], software: { Blender: ["4.5"] }, requiresArtifacts: [], producesArtifacts: ["fbx-character"], checkedAt: "2026-11-27T10:00:00Z" };
const make = (overrides: Partial<ResourceCandidate> = {}): ResourceCandidate => ({ ...candidate, ...overrides });
test("HTTPS exact host only; no credentials, nonstandard ports or lookalikes", () => {
  assert.equal(screenResourceUrl(candidate.url, policy.allowedHosts), true);
  for (const url of ["http://example.com", "javascript:alert(1)", "https://example.com.evil.test", "https://user@example.com", "https://example.com:444", "https://127.0.0.1"]) assert.equal(screenResourceUrl(url, policy.allowedHosts), false);
});
test("stale, invalid and future checks are excluded", () => {
  for (const checkedAt of ["2026-11-25T12:00:00Z", "invalid", "2026-11-28T12:00:00Z"]) assert.equal(rankResearchResources([make({ checkedAt })], ctx, policy).length, 0);
});
test("hard filters cost, time, difficulty, version, device and offline needs", () => {
  for (const change of [{ access: "unknown" }, { access: "paid" }, { minutes: 61 }, { difficulty: "advanced" }, { software: { Blender: ["3.6"] } }, { devices: ["phone"] }] as Partial<ResourceCandidate>[]) assert.equal(rankResearchResources([make(change)], ctx, policy).length, 0);
  assert.equal(rankResearchResources([candidate], { ...ctx, internet: false }, policy).length, 0);
  assert.equal(rankResearchResources([make({ offline: true })], { ...ctx, internet: false }, policy).length, 1);
});
test("deduplicates and ranks relevance deterministically", () => {
  const better = make({ id: "better", url: "https://example.com/better", topics: ["blender", "characters"] });
  const duplicate = make({ id: "dup", url: candidate.url + "#section" });
  const ranked = rankResearchResources([candidate, duplicate, better], { ...ctx, topics: ["blender", "characters"] }, policy);
  assert.equal(ranked.length, 2); assert.equal(ranked[0].resource.id, "better");
});
test("compatible artifact chains connect Blender to Unity", () => {
  const unity = make({ id: "import", title: "Import character", url: "https://example.com/import", topics: ["unity"], software: { Unity: ["6"] }, requiresArtifacts: ["fbx-character"], producesArtifacts: ["unity-character"] });
  assert.equal(rankResearchResources([unity], { ...ctx, topics: ["unity"] }, policy).length, 0);
  const chain = planResourceChain([{ topics: ["blender"], candidates: [candidate] }, { topics: ["unity"], candidates: [unity] }], ctx, policy);
  assert.deepEqual(chain.selected.map(x => x.resource.id), ["model", "import"]); assert.equal(chain.blockedStage, null);
});
test("backtracks rather than selecting an incompatible best first resource", () => {
  const wrong = make({ id: "wrong", url: "https://example.com/wrong", minutes: 15, producesArtifacts: ["obj-character"] });
  const unity = make({ id: "import", url: "https://example.com/import", topics: ["unity"], requiresArtifacts: ["fbx-character"] });
  const stages = [{ topics: ["blender"], candidates: [wrong, candidate] }, { topics: ["unity"], candidates: [unity] }];
  assert.equal(planResourceChain(stages, ctx, policy).selected[0].resource.id, "model");
  assert.equal(planResourceChain([{ ...stages[0], candidates: [wrong] }, stages[1]], ctx, policy).blockedStage, 1);
});
test("invalid policy and empty topics fail closed", () => {
  assert.deepEqual(rankResearchResources([candidate], ctx, { ...policy, maxAgeMs: -1 }), []);
  assert.deepEqual(rankResearchResources([candidate], { ...ctx, topics: [] }, policy), []);
});
