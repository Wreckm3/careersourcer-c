import assert from "node:assert/strict";
import { test } from "node:test";
import { planOpportunity, type OpportunityInput } from "../src/lib/atlas/opportunityEngine";
import { getRadarSignals } from "../src/lib/atlas/radar";
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

const radarNow = Date.parse("2026-11-27T12:00:00Z");
test("Radar matches signals to the active path and covers all current branches", () => {
  for (const branchId of ["web-development", "game-development", "app-development", "ai-automation", "ui-ux-design", "cybersecurity", "freelancing", "content-creation", "entrepreneurship", "digital-marketing", "e-commerce", "personal-finance", "graphic-design", "video-editing", "blender-3d", "animation", "photography", "music-production"]) {
    const cards = getRadarSignals({ ...base, branchId }, radarNow);
    assert.ok(cards.length, branchId);
    assert.ok(cards.every(card => card.relevant && card.experiments.length > 0));
  }
  for (const branchId of ["unknown", "constructor", "__proto__"]) assert.deepEqual(getRadarSignals({ ...base, branchId }, radarNow), []);
});
test("Radar distinguishes evidence, target and hypothesis and only uses fixed original URLs", () => {
  const cards = getRadarSignals(base, radarNow, true);
  assert.equal(cards.length, 3);
  assert.deepEqual(cards.map(card => card.kind), ["reported launch", "stated target", "reported statistic"]);
  assert.match(cards[1].evidence, /not an achieved result/);
  assert.match(cards[2].evidence, /historical statistic/);
  for (const card of cards) {
    assert.ok(card.evidence && card.possibleEffect && card.period && card.publisher);
    const url = new URL(card.url);
    assert.equal(url.protocol, "https:");
    assert.ok(["www.kenyanews.go.ke", "mdm.knbs.or.ke"].includes(url.hostname));
    assert.equal(url.username + url.password + url.port, "");
  }
});
test("Radar does not silently treat other paths as relevant", () => {
  const cards = getRadarSignals({ ...base, branchId: "personal-finance" }, radarNow, true);
  assert.equal(cards.filter(card => card.relevant).length, 1);
  assert.equal(cards.filter(card => !card.relevant).length, 2);
});
test("Radar pauses expired experiments and rejects future or invalid review times", () => {
  assert.deepEqual(getRadarSignals(base, Date.parse("2026-11-26T23:59:59Z")), []);
  assert.deepEqual(getRadarSignals(base, NaN), []);
  assert.deepEqual(getRadarSignals(base, 9e15), []);
  assert.ok(getRadarSignals(base, Date.parse("2026-12-26T23:59:59Z")).every(card => !card.stale && card.experiments.length));
  const expired = getRadarSignals(base, Date.parse("2026-12-27T00:00:00Z"));
  assert.ok(expired.length && expired.every(card => card.stale && card.experiments.length === 0));
});
test("Radar prefers paper research when time and equipment are missing", () => {
  const cards = getRadarSignals({ ...base, branchId: "game-development", device: "phone", minutes: 30 }, radarNow);
  assert.ok(cards.length);
  for (const card of cards) for (const experiment of card.experiments) {
    assert.equal(experiment.blockers.length, 2);
    assert.match(experiment.nextAction, /Do not purchase/);
  }
});
test("Radar supports offline sample work and validation without claiming sales", () => {
  const cards = getRadarSignals({ ...base, readiness: "reviewed", internet: false }, radarNow);
  assert.ok(cards.length);
  for (const card of cards) for (const experiment of card.experiments) {
    assert.equal(experiment.blockers.length, 0);
    assert.match(experiment.nextAction, /original sample you can demonstrate/);
    assert.ok(experiment.validate);
  }
});
test("Radar returns independent result objects and no location or learner identifiers", () => {
  const first = getRadarSignals(base, radarNow);
  first[0].experiments[0].blockers.push("mutated");
  const again = getRadarSignals(base, radarNow);
  assert.equal(again[0].experiments[0].blockers.length, 0);
  assert.ok(again.every(card => !("userId" in card) && !("location" in card)));
});
