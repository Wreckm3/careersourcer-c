import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveMastery } from "../src/lib/atlas/masteryRecovery";

describe("Atlas mastery and recovery", () => {
  const lesson = (id: string, prerequisites: string[] = []) => ({ id, title: id, exercise: "Practise", prerequisites });
  const attempt = (id: string, item_id: string, roadmap_revision = 1, created_at = "2026-11-26T00:00:00Z") => ({ id, item_id, roadmap_revision, created_at });
  const assessment = (evidence_id: string, decision: "criteria_met" | "developing" | "needs_practice", roadmap_revision = 1) => ({ id: evidence_id, evidence_id, decision, roadmap_revision, created_at: "2026-11-26T00:01:00Z", nextStep: "Try again", remainingGaps: ["Explain the result"] });
  it("counts criteria across more than twelve lessons", () => {
    const lessons = Array.from({ length: 20 }, (_, i) => lesson(`l${i}`));
    const evidence = lessons.map((item) => attempt(item.id, item.id));
    const result = deriveMastery(lessons, 1, evidence, evidence.map((item) => assessment(item.id, "criteria_met")));
    assert.equal(result.met.size, 20);
    assert.equal(result.next, null);
  });
  it("does not use an old revision or older assessed attempt to certify a new attempt", () => {
    const result = deriveMastery([lesson("a")], 2, [attempt("new", "a", 2, "2026-11-26T02:00:00Z"), attempt("prior", "a", 2), attempt("old", "a")], [assessment("prior", "criteria_met", 2), assessment("old", "criteria_met")]);
    assert.equal(result.met.size, 0);
    assert.equal(result.next?.status, "awaiting_assessment");
  });
  it("prioritizes saved recovery guidance and does not recommend a blocked lesson", () => {
    const result = deriveMastery([lesson("blocked", ["a"]), lesson("independent"), lesson("a")], 1, [attempt("a1", "a")], [assessment("a1", "developing")]);
    assert.equal(result.next?.lesson.id, "a");
    assert.equal(result.next?.assessment?.nextStep, "Try again");
    assert.equal(result.blocked[0]?.lesson.id, "blocked");
  });
  it("does not invent completion when prerequisites cannot be satisfied", () => {
    const result = deriveMastery([lesson("a", ["missing"])], 1, [], []);
    assert.equal(result.next, null);
    assert.equal(result.met.size, 0);
    assert.equal(result.blocked.length, 1);
  });
});
