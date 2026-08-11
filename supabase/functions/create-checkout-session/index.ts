import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PRICES = {
  builder: "STRIPE_PRICE_BUILDER",
  professional: "STRIPE_PRICE_PROFESSIONAL",
  elite: "STRIPE_PRICE_ELITE",
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }, auth: { persistSession: false },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Sign in before upgrading." }, { status: 401, headers: corsHeaders });

    const { tier } = await req.json();
    if (!(tier in PRICES)) return Response.json({ error: "Invalid plan." }, { status: 400, headers: corsHeaders });
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get(PRICES[tier as keyof typeof PRICES]);
    const appUrl = Deno.env.get("APP_URL")?.replace(/\/$/, "");
    if (!stripeKey || !priceId || !appUrl) {
      return Response.json({ error: "Card checkout is not configured yet." }, { status: 503, headers: corsHeaders });
    }

    const { data: existing } = await supabase.from("subscriptions").select("provider_customer_id").eq("user_id", user.id).maybeSingle();
    const form = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${appUrl}/pricing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      client_reference_id: user.id,
      "metadata[user_id]": user.id,
      "metadata[tier]": tier,
      "subscription_data[metadata][user_id]": user.id,
      "subscription_data[metadata][tier]": tier,
    });
    if (existing?.provider_customer_id) form.set("customer", existing.provider_customer_id);

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST", headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form,
    });
    const session = await stripeResponse.json();
    if (!stripeResponse.ok || !session.url) {
      console.error("Stripe checkout creation failed", session);
      return Response.json({ error: "Stripe could not create checkout." }, { status: 502, headers: corsHeaders });
    }
    return Response.json({ url: session.url }, { headers: corsHeaders });
  } catch (error) {
    console.error("Checkout setup failed", error);
    return Response.json({ error: "Checkout could not be started." }, { status: 500, headers: corsHeaders });
  }
});
