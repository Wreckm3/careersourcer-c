import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { handleStripeWebhook, normalizeStripeEvent, verifyStripeSignature } from "../supabase/functions/_shared/stripe/events";

const secret = "whsec_local_fixture";
const now = 1_800_000_000;
const userId = "67b1ba51-4417-4bce-a72d-1fb11ed2b93b";
const prices = {
  price_monthly: { tier: "professional", currency: "usd", amount: 239, interval: "month", intervalCount: 1 },
  price_quarterly: { tier: "builder", currency: "usd", amount: 297, interval: "month", intervalCount: 3 },
} as const;

function invoiceEvent(id = "evt_paid", quarterly = false) {
  const amount = quarterly ? 297 : 239;
  const tier = quarterly ? "builder" : "professional";
  const start = new Date(now * 1000);
  const target = new Date(start);
  target.setUTCMonth(target.getUTCMonth() + (quarterly ? 3 : 1));
  const periodEnd = Math.floor(target.getTime() / 1000);
  return {
    id, type: "invoice.paid", created: now, api_version: "2024-10-28.acacia",
    data: { object: {
      id: "in_123", object: "invoice", status: "paid", paid: true, paid_out_of_band: false, amount_paid: amount,
      total: amount, currency: "usd", customer: "cus_123", subscription: "sub_123",
      charge: "ch_123", payment_intent: "pi_123",
      subscription_details: { metadata: { user_id: userId, tier } },
      lines: { has_more: false, data: [{ type: "subscription", proration: false, quantity: 1, amount, currency: "usd",
        period: { start: now, end: periodEnd },
        price: { id: quarterly ? "price_quarterly" : "price_monthly", currency: "usd", unit_amount: amount,
          recurring: { interval: "month", interval_count: quarterly ? 3 : 1 } },
      }] },
    } },
  };
}

function signedRequest(event: unknown, signatureSecret = secret) {
  const body = JSON.stringify(event);
  const signature = createHmac("sha256", signatureSecret).update(`${now}.${body}`).digest("hex");
  return new Request("http://localhost/stripe-webhook", {
    method: "POST", headers: { "stripe-signature": `t=${now},v1=${signature}` }, body,
  });
}

test("authenticates Stripe signatures and rejects forged or stale deliveries", async () => {
  const body = "fixture";
  const digest = createHmac("sha256", secret).update(`${now}.${body}`).digest("hex");
  assert.equal(await verifyStripeSignature(body, `t=${now},v1=${digest}`, secret, now), true);
  assert.equal(await verifyStripeSignature(body, `t=${now},v1=${digest}`, "wrong", now), false);
  assert.equal(await verifyStripeSignature(body, `t=${now},v1=${digest}`, secret, now + 301), false);
});

test("normalizes verified monthly and quarterly invoices using their actual amounts and period", () => {
  for (const quarterly of [false, true]) {
    const event = normalizeStripeEvent(invoiceEvent("evt_paid", quarterly), prices);
    assert.equal(event.kind, "payment");
    assert.equal(event.amount, quarterly ? 297 : 239);
    assert.equal(event.currency, "usd");
    assert.equal(event.interval_count, quarterly ? 3 : 1);
    assert.equal(event.invoice_id, "in_123");
    assert.equal(event.charge_id, "ch_123");
    assert.equal(event.payment_intent_id, "pi_123");
    const expectedEnd = normalizeStripeEvent(invoiceEvent("evt_expected", quarterly), prices).period_end;
    assert.equal(event.period_end, expectedEnd);
  }
});

test("rejects incorrect amounts, currencies and unpaid invoices", () => {
  const wrongAmount = invoiceEvent();
  wrongAmount.data.object.amount_paid = 1;
  assert.throws(() => normalizeStripeEvent(wrongAmount, prices));
  const wrongCurrency = invoiceEvent();
  wrongCurrency.data.object.currency = "kes";
  assert.throws(() => normalizeStripeEvent(wrongCurrency, prices));
  const unpaid = invoiceEvent();
  unpaid.data.object.paid = false;
  assert.throws(() => normalizeStripeEvent(unpaid, prices));
});

test("database failure is retryable and a duplicate delivery is harmless", async () => {
  const applied = new Set<string>();
  let fail = true;
  let fulfillments = 0;
  const fulfill = async (event: { event_id: string }) => {
    if (fail) { fail = false; throw new Error("fixture database failure"); }
    if (!applied.has(event.event_id)) { applied.add(event.event_id); fulfillments++; }
  };
  const deps = { webhookSecret: secret, prices, fulfill, verifyPayment: async () => {}, nowSeconds: now };
  assert.equal((await handleStripeWebhook(signedRequest(invoiceEvent()), deps)).status, 500);
  assert.equal((await handleStripeWebhook(signedRequest(invoiceEvent()), deps)).status, 200);
  assert.equal((await handleStripeWebhook(signedRequest(invoiceEvent()), deps)).status, 200);
  assert.equal(fulfillments, 1);
});

test("invalid signatures never reach fulfillment", async () => {
  let called = false;
  const response = await handleStripeWebhook(signedRequest(invoiceEvent(), "wrong"), {
    webhookSecret: secret, prices, nowSeconds: now,
    verifyPayment: async () => { called = true; },
    fulfill: async () => { called = true; },
  });
  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test("normalizes successful refunds and disputes by payment references", () => {
  const refund = normalizeStripeEvent({ id: "evt_refund", type: "refund.updated", created: now,
    api_version: "2024-10-28.acacia", data: { object: { id: "re_123", charge: "ch_123",
      payment_intent: "pi_123", amount: 100, currency: "usd", status: "succeeded" } } }, prices);
  assert.equal(refund.kind, "refund");
  assert.equal(refund.charge_id, "ch_123");
  assert.equal(refund.payment_intent_id, "pi_123");
  const dispute = normalizeStripeEvent({ id: "evt_dispute", type: "charge.dispute.created", created: now,
    api_version: "2024-10-28.acacia", data: { object: { id: "dp_123", charge: "ch_123",
      payment_intent: "pi_123", amount: 239, currency: "usd", status: "needs_response" } } }, prices);
  assert.equal(dispute.kind, "dispute");
  assert.equal(dispute.charge_id, "ch_123");
  assert.equal(dispute.amount, 239);
});

test("pending refunds do not become successful adjustments", () => {
  const pending = normalizeStripeEvent({ id: "evt_pending", type: "refund.updated", created: now,
    api_version: "2024-10-28.acacia", data: { object: { id: "re_123", charge: "ch_123",
      amount: 100, currency: "usd", status: "pending" } } }, prices);
  assert.equal(pending.kind, "ignore");
});

test("rejects invoice periods that do not match the catalog interval", () => {
  const mismatched = invoiceEvent();
  mismatched.data.object.lines.data[0].period.end = now + 32 * 86400;
  assert.throws(() => normalizeStripeEvent(mismatched, prices), /billing interval/);
});

test("uses calendar month boundaries for monthly and quarterly periods", () => {
  const monthly = invoiceEvent();
  const monthlyObject = monthly.data.object;
  const monthlyStart = Date.UTC(2028, 0, 31, 12, 0, 0) / 1000;
  monthlyObject.lines.data[0].period = {
    start: monthlyStart,
    end: Date.UTC(2028, 1, 29, 12, 0, 0) / 1000,
  };
  assert.doesNotThrow(() => normalizeStripeEvent(monthly, prices));

  const quarterly = invoiceEvent("evt_quarterly", true);
  const quarterlyObject = quarterly.data.object;
  const quarterlyStart = Date.UTC(2028, 0, 31, 12, 0, 0) / 1000;
  quarterlyObject.lines.data[0].period = {
    start: quarterlyStart,
    end: Date.UTC(2028, 3, 30, 12, 0, 0) / 1000,
  };
  assert.doesNotThrow(() => normalizeStripeEvent(quarterly, prices));
});

test("normalizes open, won and lost disputes without losing their status", () => {
  const open = normalizeStripeEvent({
    id: "evt_open", type: "charge.dispute.created", created: now,
    api_version: "2024-10-28.acacia",
    data: { object: { id: "dp_open", charge: "ch_123", payment_intent: "pi_123",
      amount: 239, currency: "usd", status: "needs_response", reason: "fraudulent" } },
  }, prices);
  assert.equal(open.status, "open");
  const won = normalizeStripeEvent({
    id: "evt_won", type: "charge.dispute.closed", created: now,
    api_version: "2024-10-28.acacia",
    data: { object: { id: "dp_won", charge: "ch_123", payment_intent: "pi_123",
      amount: 239, currency: "usd", status: "won" } },
  }, prices);
  assert.equal(won.status, "won");
  const lost = normalizeStripeEvent({
    id: "evt_lost", type: "charge.dispute.closed", created: now,
    api_version: "2024-10-28.acacia",
    data: { object: { id: "dp_lost", charge: "ch_123", payment_intent: "pi_123",
      amount: 239, currency: "usd", status: "lost" } },
  }, prices);
  assert.equal(lost.status, "lost");
});
