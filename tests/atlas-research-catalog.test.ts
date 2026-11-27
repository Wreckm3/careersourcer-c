import assert from "node:assert/strict";
import { test } from "node:test";
import { planCuratedChain, resolveCuratedResource, searchCuratedResources } from "../supabase/functions/_shared/atlas/researchCatalog.ts";
import type { ResearchContext } from "../src/lib/atlas/researchEngine.ts";
const now = Date.parse("2026-11-27T12:00:00Z");
const ctx: ResearchContext = { topics: ["model-import"], difficulty: "intermediate", maxMinutes: 60, freeOnly: true, internet: true, device: "computer", software: { unity: "6.0" }, availableArtifacts: ["fbx-model", "humanoid-rig"] };
test("catalog returns only curated identifiers and resolves official source", () => {
  const result = searchCuratedResources(ctx, now);
  assert.deepEqual(result.map(x => x.id), ["unity-6000-model-import"]);
  assert.equal(resolveCuratedResource(result[0].id, now)?.url, "https://docs.unity3d.com/6000.0/Documentation/Manual/ImportingModelFiles.html");
  for (const id of ["__proto__", "constructor", "https://example.org", "missing"]) assert.equal(resolveCuratedResource(id, now), null);
});
test("stale reviews and future timestamps fail closed", () => {
  for (const date of [now + 31*86400000, now - 86400000, NaN]) {
    assert.deepEqual(searchCuratedResources(ctx, date), []);
    assert.equal(resolveCuratedResource("unity-6000-model-import", date), null);
  }
});
test("documentation chain preserves explicit rig prerequisite", () => {
  assert.deepEqual(planCuratedChain([["model-import"], ["avatar"]], ctx, now), { resourceIds: ["unity-6000-model-import", "unity-6000-humanoid-avatar"], blockedStage: null });
  assert.deepEqual(planCuratedChain([["model-import"], ["avatar"]], { ...ctx, availableArtifacts: ["fbx-model"] }, now), { resourceIds: ["unity-6000-model-import"], blockedStage: 1 });
});
test("unsupported versions and devices or missing artifacts do not match", () => {
  for (const overrides of [{ software: { unity: "2022" } }, { device: "phone" as const }, { availableArtifacts: [] }, { internet: false }]) assert.deepEqual(searchCuratedResources({ ...ctx, ...overrides }, now), []);
});
