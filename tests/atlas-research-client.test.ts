import assert from "node:assert/strict";
import { test } from "node:test";
import { buildResearchPilotRequest, parseResearchPilotResult, draftResearchStudyPrompt } from "../src/lib/atlas/researchClient.ts";
const resource = { id: "unity-6000-model-import", title: "Importing a model", url: "https://docs.unity3d.com/6000.0/Documentation/Manual/ImportingModelFiles.html", source: "Unity 6.0 Manual", reviewedAt: "2026-11-27T00:00:00Z", estimatedMinutes: 25, reviewKind: "manual-documentation-review" };
const body = { resources: [resource], blockedStage: null, source: "curated-catalogue", liveSearch: false, masteryVerified: false };
test("request sends only constrained planning metadata", () => {
  const r = buildResearchPilotRequest({ avatar: true, fbx: true, rig: false, minutes: 60 });
  assert.deepEqual(r.stages, [["model-import"], ["avatar"]]);
  assert.deepEqual(r.availableArtifacts, ["fbx-model"]);
  assert.equal(Object.hasOwn(r, "userId"), false);
});
test("only reviewed source responses yield clickable links", () => {
  assert.equal(parseResearchPilotResult(body, 1)?.resources[0].url, resource.url);
  for (const url of ["javascript:alert(1)", "http://docs.unity3d.com/6000.0/Documentation/Manual/a.html", "https://docs.unity3d.com.evil.test/6000.0/Documentation/Manual/a.html", "https://docs.unity3d.com/redirect?url=evil", "https://user@docs.unity3d.com/6000.0/Documentation/Manual/a.html"]) assert.equal(parseResearchPilotResult({ ...body, resources: [{ ...resource, url }] }, 1), null);
  assert.equal(parseResearchPilotResult({ ...body, liveSearch: true }, 1), null);
  assert.equal(parseResearchPilotResult({ ...body, masteryVerified: true }, 1), null);
});
test("partial or malformed sequences cannot prepare a complete plan", () => {
  const partial = parseResearchPilotResult({ ...body, blockedStage: 1 }, 2);
  assert.ok(partial); assert.equal(draftResearchStudyPrompt(partial), null);
  assert.equal(parseResearchPilotResult(body, 2), null);
  assert.equal(parseResearchPilotResult({ ...body, blockedStage: 0 }, 2), null);
  assert.equal(parseResearchPilotResult({ ...body, resources: [resource, resource] }, 2), null);
});
test("complete sequence creates draft without link fabrication or mastery claim", () => {
  const result = parseResearchPilotResult(body, 1);
  assert.ok(result); const draft = draftResearchStudyPrompt(result);
  assert.match(draft ?? "", /preserve my existing roadmap and evidence/);
  assert.match(draft ?? "", /not proof of mastery/);
  assert.doesNotMatch(draft ?? "", /https:\/\//);
});
