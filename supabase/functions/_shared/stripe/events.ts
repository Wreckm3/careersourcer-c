// Supported webhook payload version. Configure the Stripe endpoint to this
// version: event payloads are versioned independently of outbound API calls.
export const STRIPE_EVENT_API_VERSION = "2024-10-28.acacia";

export type StripePrice = { tier: "builder" | "professional" | "elite"; currency: string; amount: number; interval: "month"; intervalCount: 1 | 3 };
export type StripePrices = Record<string, StripePrice>;
type Obj = Record<string, any>; // Stripe webhook data is untrusted JSON and is validated below.

function record(value: unknown): Obj {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
}
function id(value: unknown): string | null {
  const result = typeof value === "string" ? value : record(value).id;
  return typeof result === "string" && result.length > 0 ? result : null;
}
function integer(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function iso(value: unknown): string {
  requireValue(integer(value) && value > 0 && value < 8_640_000_000_000, "Invalid service period");
  return new Date(value * 1000).toISOString();
}

function calendarMonthsAfter(value: number, months: 1 | 3): number {
  const date = new Date(value * 1000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonth = month + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return Math.floor(Date.UTC(
    targetYear,
    normalizedMonth,
    Math.min(day, lastDay),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ) / 1000);
}

export function parseStripePrices(raw: string | undefined): StripePrices {
  requireValue(raw, "Stripe price catalog is not configured");
  const source = JSON.parse(raw) as unknown;
  requireValue(source && typeof source === "object" && !Array.isArray(source), "Invalid Stripe price catalog");
  const prices: StripePrices = {};
  for (const [priceId, value] of Object.entries(source)) {
    const p = record(value);
    requireValue(/^price_[A-Za-z0-9_]+$/.test(priceId) && ["builder", "professional", "elite"].includes(p.tier) && /^[a-z]{3}$/.test(p.currency) && integer(p.amount) && p.amount > 0 && p.interval === "month" && (p.intervalCount === 1 || p.intervalCount === 3), "Invalid Stripe price catalog entry");
    prices[priceId] = { tier: p.tier, currency: p.currency, amount: p.amount, interval: "month", intervalCount: p.intervalCount };
  }
  requireValue(Object.keys(prices).length > 0, "Empty Stripe price catalog");
  return prices;
}

/** Converts only signed, supported-version Stripe events into the database contract. */
export function normalizeStripeEvent(input: unknown, prices: StripePrices): Obj {
  const event = record(input), object = record(record(event.data).object);
  requireValue(typeof event.id === "string" && event.id.startsWith("evt_") && typeof event.type === "string" && integer(event.created), "Invalid Stripe event");
  requireValue(event.api_version === STRIPE_EVENT_API_VERSION, "Unsupported Stripe event API version");
  const base: Obj = { event_id: event.id, event_type: event.type, event_created: event.created, kind: "ignore" };
  if (event.type === "invoice.paid") {
    const metadata = record(record(object.subscription_details).metadata);
    const lines = record(object.lines);
    requireValue(object.paid === true && object.paid_out_of_band === false && object.status === "paid" && id(object.id) && id(object.subscription) && id(object.customer) && id(object.charge) && id(object.payment_intent), "Invoice is not a verified paid subscription invoice");
    requireValue(lines.has_more === false && Array.isArray(lines.data) && lines.data.length === 1, "Unsupported invoice lines");
    const line = record(lines.data[0]), price = record(line.price), recurring = record(price.recurring), period = record(line.period);
    const configured = prices[id(price.id) ?? ""];
    requireValue(configured && line.type === "subscription" && line.proration === false && line.quantity === 1, "Unsupported invoice price or line");
    requireValue(price.currency === configured.currency && object.currency === configured.currency && line.currency === configured.currency && price.unit_amount === configured.amount && line.amount === configured.amount && object.amount_paid === configured.amount && object.total === configured.amount, "Invoice amount or currency does not match the catalog");
    requireValue(recurring.interval === configured.interval && recurring.interval_count === configured.intervalCount && metadata.tier === configured.tier, "Invoice interval or tier does not match the catalog");
    requireValue(typeof metadata.user_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(metadata.user_id), "Invoice user is missing");
    requireValue(integer(period.start) && integer(period.end) && period.end > period.start, "Invalid invoice service period");
    requireValue(period.end === calendarMonthsAfter(period.start, configured.intervalCount), "Invoice service period does not match the configured billing interval");
    return { ...base, kind: "payment", user_id: metadata.user_id, tier: configured.tier, customer_id: id(object.customer), subscription_id: id(object.subscription), invoice_id: id(object.id), charge_id: id(object.charge), payment_intent_id: id(object.payment_intent), amount: object.amount_paid, currency: object.currency, paid: true, period_start: iso(period.start), period_end: iso(period.end), interval: configured.interval, interval_count: configured.intervalCount };
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const metadata = record(object.metadata), status = object.status;
    requireValue(id(object.id) && id(object.customer) && typeof status === "string", "Invalid subscription event");
    requireValue(["active", "trialing", "past_due", "canceled", "unpaid", "expired", "incomplete", "incomplete_expired", "paused"].includes(status), "Unsupported subscription status");
    return { ...base, kind: "subscription", subscription_id: id(object.id), customer_id: id(object.customer), user_id: typeof metadata.user_id === "string" ? metadata.user_id : null, status, cancel_at_period_end: object.cancel_at_period_end === true };
  }
  if (event.type === "refund.created" || event.type === "refund.updated") {
    requireValue(id(object.id) && id(object.charge) && integer(object.amount) && object.amount > 0 && typeof object.currency === "string", "Invalid refund");
    // A pending or failed refund does not change settlement.
    if (object.status !== "succeeded") return base;
    return { ...base, kind: "refund", refund_id: id(object.id), invoice_id: id(object.invoice), charge_id: id(object.charge), payment_intent_id: id(object.payment_intent), amount: object.amount, currency: object.currency, status: object.status };
  }
  if (["charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed"].includes(event.type)) {
    requireValue(id(object.id) && id(object.charge) && integer(object.amount) && object.amount > 0 && typeof object.currency === "string" && typeof object.status === "string", "Invalid dispute");
    const status = String(object.status).toLowerCase();
    const acceptedStatuses = ["needs_response", "warning_needs_response", "under_review", "warning_under_review", "won", "lost", "charge_refunded"];
    requireValue(acceptedStatuses.includes(status), "Unsupported dispute status");
    const normalizedStatus = ["needs_response", "warning_needs_response", "under_review", "warning_under_review"].includes(status)
      ? "open"
      : status === "won"
        ? "won"
        : "lost";
    return { ...base, kind: "dispute", dispute_id: id(object.id), invoice_id: id(object.invoice), charge_id: id(object.charge), payment_intent_id: id(object.payment_intent), amount: object.amount, currency: object.currency, status: normalizedStatus, reason: typeof object.reason === "string" ? object.reason : null };
  }
  return base;
}

export async function verifyStripeSignature(raw: string, header: string, secret: string, nowSeconds = Date.now() / 1000): Promise<boolean> {
  const pieces = header.split(",").map((part) => part.split("="));
  const timestamp = pieces.find(([key]) => key === "t")?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || !Number.isSafeInteger(Number(timestamp)) || Math.abs(nowSeconds - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
  const expected = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
  return pieces.filter(([name]) => name === "v1").some(([, candidate]) => {
    if (!candidate || candidate.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
    return diff === 0;
  });
}

export function verifyStripeCharge(payment: Obj, charge: unknown): void {
  const item = record(charge);
  requireValue(id(item.id) === payment.charge_id && item.paid === true && item.captured === true && item.status === "succeeded" && item.amount === payment.amount && item.amount_captured === payment.amount && item.currency === payment.currency && id(item.invoice) === payment.invoice_id && id(item.payment_intent) === payment.payment_intent_id, "Stripe charge does not match paid invoice");
}

export async function handleStripeWebhook(req: Request, deps: { webhookSecret: string; prices: StripePrices; fulfill: (event: Obj) => Promise<void>; verifyPayment: (event: Obj) => Promise<void>; nowSeconds?: number }): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const raw = await req.text();
  if (!deps.webhookSecret || !await verifyStripeSignature(raw, req.headers.get("stripe-signature") ?? "", deps.webhookSecret, deps.nowSeconds)) return new Response("Invalid signature", { status: 400 });
  try {
    const event = normalizeStripeEvent(JSON.parse(raw), deps.prices);
    if (event.kind === "payment") await deps.verifyPayment(event);
    await deps.fulfill(event);
    return new Response("ok", { status: 200 });
  } catch {
    // Return 5xx for retry; never log Stripe payloads or personal details.
    console.error("Stripe webhook processing failed");
    return new Response("Webhook processing failed", { status: 500 });
  }
}
