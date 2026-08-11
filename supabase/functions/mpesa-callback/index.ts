import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const expected = Deno.env.get("MPESA_CALLBACK_SECRET");
  if (!expected || new URL(req.url).searchParams.get("token") !== expected) return new Response("Unauthorized", { status: 401 });
  try {
    const payload = await req.json();
    const callback = payload?.Body?.stkCallback;
    const checkoutRequestId = callback?.CheckoutRequestID;
    if (!checkoutRequestId) return new Response("Invalid callback", { status: 400 });
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const eventId = `${checkoutRequestId}:${callback.ResultCode}`;
    const { error: eventError } = await service.from("payment_events").insert({ provider: "mpesa", provider_event_id: eventId, event_type: "stk_callback", payload });
    if (eventError?.code === "23505") return Response.json({ ResultCode: 0, ResultDesc: "Already processed" });
    if (eventError) throw eventError;
    const { data: transaction } = await service.from("payment_transactions").select("user_id,tier").eq("provider", "mpesa").eq("provider_reference", checkoutRequestId).maybeSingle();
    if (!transaction) return Response.json({ ResultCode: 0, ResultDesc: "Reference not found" });
    if (callback.ResultCode !== 0) {
      await service.from("payment_transactions").update({ status: "failed", metadata: payload }).eq("provider_reference", checkoutRequestId);
      return Response.json({ ResultCode: 0, ResultDesc: "Failure recorded" });
    }
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await service.from("payment_transactions").update({ status: "confirmed", metadata: payload }).eq("provider_reference", checkoutRequestId);
    await service.from("subscriptions").upsert({ user_id: transaction.user_id, tier: transaction.tier, status: "active", provider: "mpesa", provider_subscription_id: checkoutRequestId, current_period_end: periodEnd }, { onConflict: "user_id" });
    return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa callback failed", error);
    return new Response("Callback processing failed", { status: 500 });
  }
});
