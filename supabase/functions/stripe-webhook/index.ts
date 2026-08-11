import { createClient } from "npm:@supabase/supabase-js@2";

const validTiers = new Set(["builder", "professional", "elite"]);

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i += 1) result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return result === 0;
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function verifySignature(payload: string, header: string, secret: string) {
  const pieces = header.split(",").reduce<Record<string, string[]>>((result, part) => {
    const [key, value] = part.split("=");
    if (key && value) (result[key] ??= []).push(value);
    return result;
  }, {});
  const timestamp = pieces.t?.[0];
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return Promise.resolve(false);
  return sign(`${timestamp}.${payload}`, secret).then((expected) => (pieces.v1 ?? []).some((actual) => constantTimeEqual(actual, expected)));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const signature = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();
  if (!secret || !(await verifySignature(raw, signature, secret))) return new Response("Invalid signature", { status: 400 });

  try {
    const event = JSON.parse(raw);
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { error: eventError } = await service.from("payment_events").insert({ provider: "stripe", provider_event_id: event.id, event_type: event.type, payload: event });
    if (eventError?.code === "23505") return new Response("Already processed", { status: 200 });
    if (eventError) throw eventError;

    const object = event.data?.object ?? {};
    if (event.type === "checkout.session.completed" && object.payment_status !== "paid") {
      return new Response("Checkout has not been paid", { status: 200 });
    }
    let subscription = object;
    if (event.type === "checkout.session.completed" && typeof object.subscription === "string") {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is required to verify a subscription checkout");
      const response = await fetch(`https://api.stripe.com/v1/subscriptions/${object.subscription}`, { headers: { Authorization: `Bearer ${stripeKey}` } });
      if (!response.ok) throw new Error("Could not retrieve Stripe subscription");
      subscription = await response.json();
    }
    const metadata = { ...(object.metadata ?? {}), ...(subscription.metadata ?? {}) };
    const userId = metadata.user_id ?? object.client_reference_id;
    const tier = metadata.tier;
    if (!userId || !validTiers.has(tier)) return new Response("No actionable subscription metadata", { status: 200 });

    const subscriptionStatuses: Record<string, string> = { active: "active", trialing: "trialing", past_due: "past_due", canceled: "canceled", unpaid: "expired", incomplete_expired: "expired" };
    if (event.type === "checkout.session.completed" || event.type.startsWith("customer.subscription.")) {
      const status = event.type === "checkout.session.completed" ? subscriptionStatuses[subscription.status] ?? "active" : subscriptionStatuses[object.status] ?? "past_due";
      const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;
      const providerSubscriptionId = subscription.id ?? object.subscription ?? object.id;
      await service.from("subscriptions").upsert({ user_id: userId, tier, status, provider: "stripe", provider_customer_id: subscription.customer ?? object.customer ?? null, provider_subscription_id: providerSubscriptionId, current_period_end: currentPeriodEnd }, { onConflict: "user_id" });
      await service.from("payment_transactions").upsert({ user_id: userId, provider: "stripe", tier, amount_kes: tier === "builder" ? 99 : tier === "professional" ? 299 : 499, status: status === "active" || status === "trialing" ? "confirmed" : "failed", provider_reference: providerSubscriptionId, metadata: { eventId: event.id } }, { onConflict: "provider_reference" });
    }
    if (event.type === "charge.refunded") {
      await service.from("payment_transactions").update({ status: "refunded" }).eq("provider", "stripe").eq("provider_reference", object.payment_intent ?? "");
    }
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Stripe webhook failed", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
});
