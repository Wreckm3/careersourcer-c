import assert from "node:assert/strict";
import { test } from "node:test";
import { handleResearchRequest, parseResearchRequest, type ResearchServiceDependencies } from "../supabase/functions/_shared/atlas/researchService.ts";
const body = { stages: [["model-import"], ["avatar"]], difficulty: "intermediate", maxMinutes: 60, internet: true, device: "computer", software: { unity: "6.0" }, availableArtifacts: ["fbx-model", "humanoid-rig"] };
const deps: ResearchServiceDependencies = { enabled: true, allowedOrigins: ["https://www.careersourcer.co.ke"], authorize: async () => "allowed", now: () => Date.parse("2026-11-27T12:00:00Z") };
const request = (value: unknown = body, headers: Record<string, string> = {}) => new Request("https://example.test", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer fixture", ...headers }, body: JSON.stringify(value) });
test("default disabled gate does not authenticate or plan", async () => {
  const result = await handleResearchRequest(request(), { ...deps, enabled: false, authorize: async () => { throw new Error("must not call"); } });
  assert.equal(result.status, 503);
});
test("authentication and founder authorization fail closed", async () => {
  assert.equal((await handleResearchRequest(request(body, { authorization: "" }), deps)).status, 401);
  for (const [access, status] of [["unauthenticated", 401], ["forbidden", 403]] as const) assert.equal((await handleResearchRequest(request(), { ...deps, authorize: async () => access })).status, status);
  assert.equal((await handleResearchRequest(request(), { ...deps, authorize: async () => { throw new Error("down"); } })).status, 503);
});
test("CORS rejects foreign origins and permits intended preflight", async () => {
  assert.equal((await handleResearchRequest(request(body, { origin: "https://evil.test" }), deps)).status, 403);
  const response = await handleResearchRequest(new Request("https://example.test", { method: "OPTIONS", headers: { origin: deps.allowedOrigins[0] } }), deps);
  assert.equal(response.status, 204); assert.equal(response.headers.get("access-control-allow-origin"), deps.allowedOrigins[0]);
});
test("strict request bounds exclude arbitrary URLs, identities and paid switches", () => {
  for (const change of [{ url: "https://evil.test" }, { userId: "other" }, { freeOnly: false }, { maxMinutes: 241 }, { stages: [] }, { stages: [["https://evil.test"]] }, { availableArtifacts: Array(25).fill("a") }, { software: { unity: "https://evil.test" } }]) assert.equal(parseResearchRequest({ ...body, ...change }), null);
  assert.equal(parseResearchRequest(body)?.context.freeOnly, true);
});
test("oversized, malformed and unsupported request formats rejected", async () => {
  assert.equal((await handleResearchRequest(request({ extra: "x".repeat(5000) }), deps)).status, 413);
  assert.equal((await handleResearchRequest(request(body, { "content-type": "text/plain" }), deps)).status, 415);
  const malformed = new Request("https://example.test", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer fixture" }, body: "{" });
  assert.equal((await handleResearchRequest(malformed, deps)).status, 400);
});
test("valid plan returns only curated links and explicitly disclaims live search and mastery", async () => {
  const response = await handleResearchRequest(request(), deps);
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  const result = await response.json();
  assert.deepEqual(result.resources.map((x: { id: string }) => x.id), ["unity-6000-model-import", "unity-6000-humanoid-avatar"]);
  assert.ok(result.resources.every((x: { url: string }) => new URL(x.url).hostname === "docs.unity3d.com"));
  assert.equal(result.liveSearch, false); assert.equal(result.masteryVerified, false); assert.equal(result.blockedStage, null);
});
test("stale and missing prerequisites do not produce fabricated recommendations", async () => {
  const stale = await (await handleResearchRequest(request(), { ...deps, now: () => deps.now() + 31*86400000 })).json();
  assert.deepEqual(stale.resources, []); assert.equal(stale.blockedStage, 0);
  const partial = await (await handleResearchRequest(request({ ...body, availableArtifacts: ["fbx-model"] }), deps)).json();
  assert.equal(partial.resources.length, 1); assert.equal(partial.blockedStage, 1);
});
