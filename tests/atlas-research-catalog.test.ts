import assert from "node:assert/strict";
import { test } from "node:test";
import { createCuratedPlanCache, planCuratedChain, resolveCuratedResource, searchCuratedResources } from "../supabase/functions/_shared/atlas/researchCatalog.ts";
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

test("reviewed web and Python entries respect explicit prerequisites and versions", () => {
  const web: ResearchContext = { ...ctx, software: {}, availableArtifacts: ["web-editor-ready", "basic-file-skills", "html-familiarity"], topics: ["html-syntax"] };
  assert.deepEqual(planCuratedChain([["html-syntax"], ["css-basics"]], web, now).resourceIds, ["mdn-basic-html", "mdn-css-introduction"]);
  assert.equal(planCuratedChain([["html-syntax"], ["css-basics"]], { ...web, availableArtifacts: ["web-editor-ready", "basic-file-skills"] }, now).blockedStage, 1);
  const python = { ...ctx, software: { python: "3.14" }, availableArtifacts: ["python-interpreter-ready", "basic-programming-knowledge"], topics: ["python-syntax"] };
  assert.equal(searchCuratedResources(python, now)[0]?.id, "python-314-introduction");
  assert.deepEqual(searchCuratedResources({ ...python, software: { python: "3.13" } }, now), []);
});
test("cache canonicalizes known sets and isolates different constraints", () => {
  const cache = createCuratedPlanCache(3);
  const a = cache.plan([["model-import", "fbx"], ["avatar"]], ctx, now);
  assert.equal(cache.size, 1);
  const b = cache.plan([["fbx", "model-import"], ["avatar"]], { ...ctx, availableArtifacts: [...ctx.availableArtifacts].reverse() }, now + 1);
  assert.deepEqual(a, b); assert.equal(cache.size, 1);
  assert.equal(cache.plan([["model-import"], ["avatar"]], { ...ctx, maxMinutes: 30 }, now).blockedStage, 1);
  assert.equal(cache.size, 2);
});
test("cache copies results and never retains arbitrary query strings", () => {
  const cache = createCuratedPlanCache(2);
  const plan = cache.plan([["model-import"]], ctx, now);
  plan.resourceIds.push("invalid");
  assert.deepEqual(cache.plan([["model-import"]], ctx, now).resourceIds, ["unity-6000-model-import"]);
  cache.plan([["private-unknown-query"]], ctx, now);
  cache.plan([["model-import"]], { ...ctx, availableArtifacts: ["fbx-model", "private-unknown-artifact"] }, now);
  assert.equal(cache.size, 1);
});
test("cache bounds, freshness transitions and backwards clock fail safely", () => {
  const cache = createCuratedPlanCache(2, 1000);
  const reviewed = Date.parse("2026-11-27T00:00:00Z");
  const expires = reviewed + 30 * 86400000;
  assert.equal(cache.plan([["model-import"]], ctx, reviewed - 1).blockedStage, 0);
  assert.equal(cache.plan([["model-import"]], ctx, reviewed).blockedStage, null);
  assert.equal(cache.plan([["model-import"]], ctx, expires).blockedStage, null);
  assert.equal(cache.plan([["model-import"]], ctx, expires + 1).blockedStage, 0);
  assert.equal(cache.plan([["model-import"]], ctx, reviewed).blockedStage, null);
  cache.plan([["model-import"]], { ...ctx, maxMinutes: 30 }, now);
  cache.plan([["model-import"]], { ...ctx, maxMinutes: 45 }, now);
  assert.equal(cache.size, 2);
  assert.throws(() => createCuratedPlanCache(0));
});
