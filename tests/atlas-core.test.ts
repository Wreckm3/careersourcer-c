import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { limitAtlasRequestMessages } from "../src/lib/atlas/conversationHistory";
import { mergeAtlasText, parseAtlasSseFrame, requireAtlasAnswer } from "../src/lib/atlas/sse";
import {
  isCurrentAtlasEntitlementRequest,
  isVerifiedAtlasFounder,
  resolveAtlasEffectiveTier,
} from "../src/lib/atlas/effectiveTier";
import {
  isCurrentSubscriptionIdentity,
  isCurrentSubscriptionRequest,
} from "../src/lib/subscriptionState";
import {
  authorizeAtlasFeature,
  getBearerToken,
  isAtlasFounderEntitlement,
  resolveAtlasEntitlements,
  resolveAtlasRateLimit,
} from "../supabase/functions/_shared/atlas/entitlements";
import {
  AtlasProviderConfigurationError,
  AtlasProviderTimeoutError,
  atlasProviderDiagnostics,
  buildAtlasProviderRequest,
  classifyAtlasProviderFailure,
  DEFAULT_ATLAS_PROVIDER_TIMEOUT_MS,
  describeAtlasProviderFailure,
  getAtlasProviderFailure,
  observeAtlasProviderSseStream,
  resolveAtlasProviderConfig,
  streamAtlasCompletion,
} from "../supabase/functions/_shared/atlas/provider";

describe("Atlas stream parsing", () => {
  it("collects delta events and a final Responses API payload", () => {
    const delta = parseAtlasSseFrame('data: {"type":"response.output_text.delta","delta":"Build a "}');
    const completed = parseAtlasSseFrame('data: {"type":"response.completed","response":{"output":[{"content":[{"text":"Build a basic character controller first."}]}]}}');

    const partial = mergeAtlasText("", delta ?? {});
    const answer = mergeAtlasText(partial, completed ?? {});

    assert.equal(requireAtlasAnswer(answer, true), "Build a basic character controller first.");
  });

  it("does not turn malformed or empty streams into a fake assistant response", () => {
    assert.equal(parseAtlasSseFrame("data: not-json")?.error, "Atlas returned an unreadable response. Please try again.");
    assert.throws(() => requireAtlasAnswer("", true), /no readable response/i);
    assert.throws(() => requireAtlasAnswer("partial response", false), /ended before completion/i);
  });

  it("requires a terminal response event before accepting streamed text", () => {
    const partial = parseAtlasSseFrame('data: {"type":"response.output_text.delta","delta":"partial"}');
    const completed = parseAtlasSseFrame("data: [DONE]");

    assert.equal(partial?.completed, undefined);
    assert.equal(completed?.completed, true);
    assert.throws(
      () => requireAtlasAnswer(partial?.text ?? "", partial?.completed === true),
      /ended before completion/i,
    );
    assert.equal(requireAtlasAnswer(partial?.text ?? "", completed?.completed === true), "partial");
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
    assert.equal(config.timeoutMs, DEFAULT_ATLAS_PROVIDER_TIMEOUT_MS);

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

  it("classifies upstream failures without retaining provider messages or key material", async () => {
    const sensitiveMessage = "learner prompt must never enter diagnostics";
    const streamFailure = describeAtlasProviderFailure(200, {
      type: "error",
      error: {
        code: "insufficient_quota",
        type: "billing_error",
        message: sensitiveMessage,
      },
    });
    assert.deepEqual(streamFailure, {
      status: 200,
      eventType: "error",
      category: "billing",
    });
    assert.equal(JSON.stringify(streamFailure).includes(sensitiveMessage), false);

    const responseFailure = describeAtlasProviderFailure(200, {
      type: "response.failed",
      response: { error: { code: "model_not_found", message: sensitiveMessage } },
    });
    assert.deepEqual(responseFailure, {
      status: 200,
      eventType: "response.failed",
      category: "model",
    });
    assert.equal(JSON.stringify(responseFailure).includes(sensitiveMessage), false);

    const httpFailure = await getAtlasProviderFailure(new Response(JSON.stringify({
      error: { code: "model_not_found", message: sensitiveMessage },
    }), { status: 404 }));
    assert.deepEqual(httpFailure, {
      status: 404,
      eventType: "error_field",
      category: "model",
    });
    assert.equal(JSON.stringify(httpFailure).includes(sensitiveMessage), false);

    assert.equal(classifyAtlasProviderFailure(401, null), "authentication");
    assert.equal(classifyAtlasProviderFailure(422, null), "request");
    assert.equal(classifyAtlasProviderFailure(429, null), "rate_limit");
    assert.equal(classifyAtlasProviderFailure(503, null), "provider");

    assert.deepEqual(atlasProviderDiagnostics({
      provider: "openai",
      model: "gpt-5.6-mini",
      apiKey: "must-not-appear",
      timeoutMs: 60_000,
    }), {
      provider: "openai",
      model: "gpt-5.6-mini",
      timeoutMs: 60_000,
    });
  });

  it("observes a split provider SSE error while forwarding bytes unchanged", async () => {
    const frame = 'data: {"type":"error","error":{"code":"invalid_api_key","message":"private learner text"}}\n\n';
    const encoder = new TextEncoder();
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(frame.slice(0, 34)));
        controller.enqueue(encoder.encode(frame.slice(34)));
        controller.close();
      },
    });
    const observed: unknown[] = [];
    const body = observeAtlasProviderSseStream(source, 200, (failure) => observed.push(failure));

    assert.equal(await new Response(body).text(), frame);
    assert.deepEqual(observed, [{
      status: 200,
      eventType: "error",
      category: "authentication",
    }]);
    assert.equal(JSON.stringify(observed).includes("private learner text"), false);
  });

  it("times out a provider stream that stalls before completion", async () => {
    const config = resolveAtlasProviderConfig((key) => ({
      ATLAS_PROVIDER: "openai",
      ATLAS_MODEL: "test-model",
      ATLAS_API_KEY: "test-key",
    })[key] ?? null);

    const response = await streamAtlasCompletion(
      config,
      { input: [] },
      async (_url, init) => {
        assert.ok(init?.signal);
        return new Response(new ReadableStream<Uint8Array>({ start() {} }), {
          headers: { "Content-Type": "text/event-stream" },
        });
      },
      20,
    );

    await assert.rejects(response.body?.getReader().read(), AtlasProviderTimeoutError);
  });
});

describe("Atlas server entitlements", () => {
  it("gives only a server-confirmed founder the Pro entitlement", () => {
    const founder = resolveAtlasEntitlements(
      { tier: "free", status: "active" },
      new Date(),
      true,
    );

    assert.equal(isAtlasFounderEntitlement(true), true);
    assert.equal(founder.tier, "elite");
    assert.equal(founder.productName, "Pro");
    assert.equal(founder.canPersistMemory, true);
    assert.deepEqual(authorizeAtlasFeature(founder, "memory"), {
      allowed: true,
      upgrade: false,
      message: "",
    });
  });

  it("does not grant Pro for admin or forged frontend founder claims", () => {
    const freeUser = { tier: "free", status: "active" };
    const ordinaryAdmin = resolveAtlasEntitlements(freeUser, new Date(), "admin");
    const forgedStringClaim = resolveAtlasEntitlements(freeUser, new Date(), "founder");
    const forgedObjectClaim = resolveAtlasEntitlements(freeUser, new Date(), { role: "founder" });

    assert.equal(isAtlasFounderEntitlement("founder"), false);
    assert.equal(isAtlasFounderEntitlement({ role: "founder" }), false);
    assert.equal(ordinaryAdmin.tier, "free");
    assert.equal(forgedStringClaim.tier, "free");
    assert.equal(forgedObjectClaim.tier, "free");
  });

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

  it("keeps founder requests subject to the standard rate limit", () => {
    const founder = resolveAtlasEntitlements({ tier: "free", status: "active" }, new Date(), true);

    assert.equal(founder.tier, "elite");
    assert.equal(resolveAtlasRateLimit(false, null), "exhausted");
  });
});

describe("Atlas frontend founder entitlement", () => {
  it("grants the Atlas-only Pro tier only for a verified founder response", () => {
    assert.equal(isVerifiedAtlasFounder(true), true);
    assert.equal(resolveAtlasEffectiveTier("free", true), "elite");
    assert.equal(resolveAtlasEffectiveTier("free", false), "free");
  });

  it("keeps ordinary admins, free users, paid users, and expired users on their subscription tier", () => {
    assert.equal(resolveAtlasEffectiveTier("free", "admin"), "free");
    assert.equal(resolveAtlasEffectiveTier("free", { role: "founder" }), "free");
    assert.equal(resolveAtlasEffectiveTier("builder", false), "builder");
    assert.equal(resolveAtlasEffectiveTier("professional", null), "professional");
    // Expiry is resolved by useSubscription before it reaches the Atlas hook.
    assert.equal(resolveAtlasEffectiveTier("free", null), "free");
  });

  it("fails closed on founder RPC errors while preserving a valid paid subscription", () => {
    const rpcError = new Error("founder RPC unavailable");

    assert.equal(isVerifiedAtlasFounder(true, rpcError), false);
    assert.equal(resolveAtlasEffectiveTier("free", true, rpcError), "free");
    assert.equal(resolveAtlasEffectiveTier("elite", true, rpcError), "elite");
  });

  it("does not apply a founder result from a previous user or session", () => {
    const originalSession = {};
    const originalRequest = {
      userId: "founder-user",
      session: originalSession,
      subscriptionTier: "free" as const,
      revision: 0,
    };
    const resolution = {
      request: originalRequest,
      tier: "elite" as const,
      isFounder: true,
    };

    assert.equal(isCurrentAtlasEntitlementRequest(resolution, originalRequest), true);
    assert.equal(
      isCurrentAtlasEntitlementRequest(resolution, {
        ...originalRequest,
        session: {},
      }),
      false,
    );
    assert.equal(
      isCurrentAtlasEntitlementRequest(resolution, {
        ...originalRequest,
        userId: "next-user",
      }),
      false,
    );
    assert.equal(
      isCurrentAtlasEntitlementRequest(resolution, {
        ...originalRequest,
        revision: 1,
      }),
      false,
    );
  });
});

describe("Subscription account-switch safety", () => {
  it("fails closed while a new account has not resolved its own subscription", () => {
    assert.equal(isCurrentSubscriptionIdentity("paid-user", "free-user"), false);
    assert.equal(isCurrentSubscriptionIdentity("free-user", "free-user"), true);
    assert.equal(isCurrentSubscriptionIdentity(null, null), true);
  });

  it("ignores an older subscription response after an account switch", () => {
    assert.equal(isCurrentSubscriptionRequest(1, 2), false);
    assert.equal(isCurrentSubscriptionRequest(2, 2), true);
  });
});

describe("Atlas request guards", () => {
  it("rejects missing authentication", () => {
    assert.equal(getBearerToken(null), null);
    assert.equal(getBearerToken("Bearer session-token"), "session-token");
  });

  it("fails closed for unexpected rate-limit RPC responses", () => {
    assert.equal(resolveAtlasRateLimit(true, null), "allowed");
    assert.equal(resolveAtlasRateLimit(false, null), "exhausted");
    assert.equal(resolveAtlasRateLimit(null, null), "unavailable");
    assert.equal(resolveAtlasRateLimit(undefined, null), "unavailable");
    assert.equal(resolveAtlasRateLimit(null, new Error("missing RPC")), "unavailable");
    assert.equal(resolveAtlasRateLimit(true, { message: "database error" }), "unavailable");
  });
});
