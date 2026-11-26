import assert from "node:assert/strict";
import { test } from "node:test";
import { planOpportunity, type OpportunityInput } from "../src/lib/atlas/opportunityEngine";
const base: OpportunityInput = { branchId: "web-development", device: "computer", minutes: 60, internet: false, readiness: "learning" };
test("the catalog covers all current curriculum branches", () => {
  for (const branchId of ["web-development", "game-development", "app-development", "ai-automation", "ui-ux-design", "cybersecurity", "freelancing", "content-creation", "entrepreneurship", "digital-marketing", "e-commerce", "personal-finance", "graphic-design", "video-editing", "blender-3d", "animation", "photography", "music-production"]) {
    assert.ok(planOpportunity({ ...base, branchId }));
  }
});
test("unknown branches and prototype properties are not treated as opportunities", () => {
  for (const branchId of ["unknown", "constructor", "__proto__"]) assert.equal(planOpportunity({ ...base, branchId }), null);
});
test("equipment and time constraints prefer no-spend research", () => {
  const plan = planOpportunity({ ...base, device: "phone", minutes: 30 });
  assert.equal(plan?.stage, "research");
  assert.equal(plan?.blockers.length, 2);
  assert.match(plan?.nextAction ?? "", /Do not purchase/);
});
test("independent practice works without connectivity or paid AI", () => {
  const plan = planOpportunity(base);
  assert.equal(plan?.stage, "practice");
  assert.match(plan?.accessNote ?? "", /offline/);
  assert.match(plan?.budgetNote ?? "", /No new spending/);
});
test("self-reported prior review leads to validation, not a guaranteed sale", () => {
  const plan = planOpportunity({ ...base, readiness: "reviewed", internet: true });
  assert.equal(plan?.stage, "feedback");
  assert.match(plan?.source ?? "", /unverified/);
  assert.match(plan?.nextAction ?? "", /feedback/);
});
