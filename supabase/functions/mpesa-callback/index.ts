import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { headers: { "Content-Type": "application/json" }, status });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("MPESA_CALLBACK_SECRET");
  if (!secret || new URL(req.url).searchParams.get("token") !== secret) return new Response("Unauthorized", { status: 401 });
  try {
    const payload = await req.json().catch(() => null);
    const callback = payload?.Body?.stkCallback;
    const checkoutId = typeof callback?.CheckoutRequestID === "string" ? callback.CheckoutRequestID : null;
    if (!checkoutId || typeof callback?.ResultCode !== "number") return json({ ResultCode: 1, ResultDesc: "Invalid callback" }, 400);
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return new Response("Callback processing failed", { status: 500 });
    const service = createClient(url, key, { auth: { persistSession: false } });
    const { data: payment, error: lookupError } = await service.from("mpesa_payments").select("id,amount_kes,phone_number,status").eq("checkout_request_id", checkoutId).maybeSingle();
    if (lookupError) throw lookupError;
    if (!payment) return json({ ResultCode: 0, ResultDesc: "Reference not found" });
    if (payment.status !== "pending") return json({ ResultCode: 0, ResultDesc: "Already processed" });
    const items = Array.isArray(callback.CallbackMetadata?.Item) ? callback.CallbackMetadata.Item : [];
    const value = (name: string) => items.find((item: { Name?: string }) => item?.Name === name)?.Value;
    const amount = typeof value("Amount") === "number" ? value("Amount") : null;
    const phone = typeof value("PhoneNumber") === "number" ? String(value("PhoneNumber")) : null;
    const receipt = typeof value("MpesaReceiptNumber") === "string" ? value("MpesaReceiptNumber") : null;
    const transactionDate = value("TransactionDate") == null ? null : String(value("TransactionDate"));
    const success = callback.ResultCode === 0 && !!receipt && amount === payment.amount_kes && (!phone || phone === payment.phone_number);
    const status = success ? "success" : callback.ResultCode === 0 ? "unknown" : "failed";
    const { error } = await service.rpc("finalize_mpesa_payment", { _payment_id: payment.id, _status: status, _receipt: receipt, _result_code: callback.ResultCode, _result_description: String(callback.ResultDesc ?? ""), _callback_payload: payload, _transaction_date: transactionDate, _phone_number: phone, _amount_kes: amount });
    if (error) throw error;
    return json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa callback failed", error instanceof Error ? error.message : "unknown");
    return new Response("Callback processing failed", { status: 500 });
  }
});
