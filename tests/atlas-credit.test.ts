import assert from "node:assert/strict";
import { test } from "node:test";
import { routeAtlasRequest, estimateAtlasInputTokens } from "../supabase/functions/_shared/atlas/credits";

test("routes deterministically and fails closed when credits are insufficient", () => {
  const standard = routeAtlasRequest({
    tier: "professional", availableCredits: 120, essentialMode: false,
    feature: "mentorship", messageCharacters: 500,
  });
  assert.equal(standard.level, "auto");
  assert.equal(standard.worstCaseCredits, 2);
  assert.equal(standard.essentialMode, false);

  assert.throws(() => routeAtlasRequest({
    tier: "free", availableCredits: 0, essentialMode: false,
    feature: "mentorship", messageCharacters: 500,
  }), /credits unavailable/);
});

test("essential mode restricts routing to inexpensive deterministic requests", () => {
  const essential = routeAtlasRequest({
    tier: "elite", availableCredits: 20, essentialMode: true,
    feature: "mentorship", messageCharacters: 5000, processingLevel: "deep",
  });
  assert.equal(essential.level, "instant");
  assert.equal(essential.essentialMode, true);
  assert.equal(essential.maxOutputTokens, 400);
});

test("never raises deep tier routing above entitlements", () => {
  const builder = routeAtlasRequest({
    tier: "builder", availableCredits: 100, essentialMode: false,
    feature: "mentorship", messageCharacters: 500, processingLevel: "deep",
  });
  assert.equal(builder.level, "think");
  const free = routeAtlasRequest({
    tier: "free", availableCredits: 20, essentialMode: false,
    feature: "mentorship", messageCharacters: 500, processingLevel: "think",
  });
  assert.equal(free.level, "instant");
});

test("bounds estimated input context and remains integer-based", () => {
  const estimate = estimateAtlasInputTokens(
    [{ content: "A".repeat(400) }, { content: "B".repeat(400) }],
    { mission: "C".repeat(400) },
  );
  assert.equal(estimate, 304);
  assert.ok(Number.isSafeInteger(estimate));
});
