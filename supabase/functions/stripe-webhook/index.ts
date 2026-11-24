import { createClient } from "npm:@supabase/supabase-js@2";
import { handleStripeWebhook, parseStripePrices, STRIPE_EVENT_API_VERSION, verifyStripeCharge } from "../_shared/stripe/events.ts";

Deno.serve(async (req) => {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret || !url || !serviceKey || !stripeKey) return new Response("Webhook not configured", { status: 503 });

  try {
    const prices = parseStripePrices(Deno.env.get("STRIPE_PRICE_CATALOG"));
    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    return await handleStripeWebhook(req, {
      webhookSecret: secret,
      prices,
      verifyPayment: async (event) => {
        const chargeId = event.charge_id;
        if (typeof chargeId !== "string" || !/^ch_[A-Za-z0-9]+$/.test(chargeId)) throw new Error("Invalid charge reference");
        const response = await fetch(`https://api.stripe.com/v1/charges/${chargeId}`, {
          headers: { Authorization: `Bearer ${stripeKey}`, "Stripe-Version": STRIPE_EVENT_API_VERSION },
        });
        if (!response.ok) throw new Error("Could not verify Stripe charge");
        verifyStripeCharge(event, await response.json());
      },
      fulfill: async (event) => {
        const { error } = await service.rpc("fulfill_stripe_event", { _event: event });
        if (error) throw error;
      },
    });
  } catch {
    console.error("Stripe webhook configuration unavailable");
    return new Response("Webhook not configured", { status: 503 });
  }
});
