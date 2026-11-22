import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { limitAtlasRequestMessages } from "../src/lib/atlas/conversationHistory";
import { mergeAtlasText, parseAtlasSseFrame, requireAtlasAnswer } from "../src/lib/atlas/sse";
import {
  authorizeAtlasFeature,
  getBearerToken,
  resolveAtlasEntitlements,
  resolveAtlasRateLimit,
} from "../supabase/functions/_shared/atlas/entitlements";
import {
  AtlasProviderConfigurationError,
  buildAtlasProviderRequest,
  resolveAtlasProviderConfig,
  streamAtlasCompletion,
} from "../supabase/functions/_shared/atlas/provider";

describe("Atlas stream parsing", () => {
  it("collects delta events and a final Responses API payload", () => {
    const delta = parseAtlasSseFrame('data: {"type":"response.output_text.delta","delta":"Build a "}');
    const completed = parseAtlasSseFrame('data: {"type":"response.completed","response":{"output":[{"content":[{"text":"Build a basic character controller first."}]}]}}');

    const partial = mergeAtlasText("", delta ?? {});
    const answer = mergeAtlasText(partial, completed ?? {});

    assert.equal(requireAtlasAnswer(answer), "Build a basic character controller first.");
  });

  it("does not turn malformed or empty streams into a fake assistant response", () => {
    assert.equal(parseAtlasSseFrame("data: not-json"), null);
    assert.throws(() => requireAtlasAnswer(""), /no readable response/i);
  });

  it("turns streamed provider error events into a visible failure", () => {
    const event = parseAtlasSseFrame('data: {"type":"error","error":{"message":"upstream failed"}}');
    assert.equal(event?.error, "Atlas provider returned an error. Please try again.");
  });
});

describe("Atlas conversation bounds", () => {
  it("keeps full UI history separate from the twelve-message request window", () => {
    const history = Array.from({ length: 12 }, (_, index) => ({
      role: index % 2 === 0 ? "user" as const : "assistant" as const,
      content: `message-${index}`,
    }));
    const requestMessages = limitAtlasRequestMessages([
      ...history,
      { role: "user", content: "message-12" },
    ]);

    assert.equal(requestMessages.length, 12);
    assert.equal(requestMessages[0]?.content, "message-1");
    assert.equal(requestMessages.at(-1)?.content, "message-12");
  });
});

describe("Atlas provider configuration", () => {
  it("builds an OpenAI request with a mocked provider configuration", async () => {
    const config = resolveAtlasProviderConfig((key) => ({
      ATLAS_PROVIDER: "openai",
      ATLAS_MODEL: "test-model",
      ATLAS_API_KEY: "test-key",
    })[key] ?? null);

    const request = buildAtlasProviderRequest(config, { input: [] });
    assert.equal(request.url, "https://api.openai.com/v1/responses");
    assert.equal((request.init.headers as Record<string, string>).Authorization, "Bearer test-key");

    const response = await streamAtlasCompletion(config, { input: [] }, async () =>
      new Response("provider unavailable", { status: 503 }),
    );
    assert.equal(response.ok, false);
    assert.equal(response.status, 503);
  });

  it("rejects missing or invalid provider configuration without making a network call", () => {
    assert.throws(
      () => resolveAtlasProviderConfig(() => null),
      AtlasProviderConfigurationError,
    );
    assert.throws(
      () => resolveAtlasProviderConfig((key) => key === "ATLAS_PROVIDER" ? "unsupported" : "test"),
      AtlasProviderConfigurationError,
    );
  });
});

describe("Atlas server entitlements", () => {
  it("maps existing subscription identifiers to cumulative Basic, Plus, and Pro products", () => {
    const basic = resolveAtlasEntitlements({ tier: "builder", status: "active" });
    const plus = resolveAtlasEntitlements({ tier: "creator", status: "trialing" });
    const pro = resolveAtlasEntitlements({ tier: "visionary", status: "active" });

    assert.equal(basic.productName, "Basic");
    assert.equal(basic.canPersistMemory, true);
    assert.equal(plus.productName, "Plus");
    assert.equal(pro.productName, "Pro");
  });

  it("downgrades expired subscriptions and denies direct restricted-feature requests", () => {
    const expired = resolveAtlasEntitlements({
      tier: "elite",
      status: "active",
      current_period_end: "2020-01-01T00:00:00.000Z",
    });
    const basic = resolveAtlasEntitlements({ tier: "builder", status: "active" });

    assert.equal(expired.tier, "free");
    assert.deepEqual(authorizeAtlasFeature(basic, "research"), {
      allowed: false,
      upgrade: true,
      message: "research requires the Pro plan.",
    });
  });

  it("does not advertise unsupported Pro features as working", () => {
    const pro = resolveAtlasEntitlements({ tier: "elite", status: "active" });
    assert.deepEqual(authorizeAtlasFeature(pro, "opportunities"), {
      allowed: false,
      upgrade: false,
      message: "This Atlas capability is not available yet.",
    });
  });
});

describe("Atlas request guards", () => {
  it("rejects missing authentication and distinguishes rate-limit outcomes", () => {
    assert.equal(getBearerToken(null), null);
    assert.equal(getBearerToken("Bearer session-token"), "session-token");
    assert.equal(resolveAtlasRateLimit(true, null), "allowed");
    assert.equal(resolveAtlasRateLimit(false, null), "exhausted");
    assert.equal(resolveAtlasRateLimit(null, new Error("missing RPC")), "unavailable");
  });
});
