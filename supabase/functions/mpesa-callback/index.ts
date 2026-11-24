import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeMpesaCallback } from "../_shared/mpesa/payments.ts";

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { headers: { "Content-Type": "application/json" }, status });

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const leftBytes = await crypto.subtle.digest("SHA-256", encoder.encode(left));
  const rightBytes = await crypto.subtle.digest("SHA-256", encoder.encode(right));
  const leftArray = new Uint8Array(leftBytes), rightArray = new Uint8Array(rightBytes);
  let diff = leftArray.length ^ rightArray.length;
  for (let index = 0; index < leftArray.length; index++) diff |= leftArray[index] ^ rightArray[index];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("MPESA_CALLBACK_SECRET");
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!secret || !(await constantTimeEqual(token, secret))) return new Response("Unauthorized", { status: 401 });
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
    if (!payment) {
      console.warn("M-Pesa callback arrived before checkout reference persisted");
      return json({ ResultCode: 1, ResultDesc: "Retry later" }, 503);
    }
    if (payment.status !== "pending") return json({ ResultCode: 0, ResultDesc: "Already processed" });
    const normalized = normalizeMpesaCallback(payload, checkoutId, payment);
    const { error } = await service.rpc("finalize_mpesa_payment", {
      _payment_id: payment.id,
      _status: normalized.status,
      _receipt: normalized.receipt,
      _result_code: normalized.resultCode,
      _result_description: normalized.resultDescription,
      _callback_payload: payload,
      _transaction_date: normalized.transactionDate,
      _phone_number: normalized.phone,
      _amount_kes: normalized.amount,
    });
    if (error) throw error;
    return json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa callback failed", error instanceof Error ? error.message : "unknown");
    return new Response("Callback processing failed", { status: 500 });
  }
});
