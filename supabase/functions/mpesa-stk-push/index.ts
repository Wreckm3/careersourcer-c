import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const darajaBase = Deno.env.get("MPESA_ENV") === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
const prices = { builder: 99, professional: 299, elite: 499 } as const;
type PaidTier = keyof typeof prices;
const reply = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: corsHeaders });

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.trim().replace(/[\s()\-]/g, "");
  const match = compact.match(/^(?:\+?254|0)([17]\d{8})$/);
  return match ? `254${match[1]}` : null;
}

function timestamp() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).reduce<Record<string, string>>((out, part) => { if (part.type !== "literal") out[part.type] = part.value; return out; }, {});
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
}

async function accessToken(key: string, secret: string) {
  const result = await fetch(`${darajaBase}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` } });
  const data = await result.json().catch(() => null);
  if (!result.ok || typeof data?.access_token !== "string") throw new Error("Daraja authentication failed");
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  let service: ReturnType<typeof createClient> | null = null;
  let paymentId: string | null = null;
  try {
    const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !serviceKey) return reply({ error: "M-Pesa checkout is not configured." }, 503);
    const auth = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }, auth: { persistSession: false } });
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return reply({ error: "Sign in before starting M-Pesa checkout." }, 401);
    const body = await req.json().catch(() => null);
    const tier = body?.tier as string;
    const phone = normalizePhone(body?.phoneNumber);
    if (!(tier in prices)) return reply({ error: "Invalid paid plan." }, 400);
    if (!phone) return reply({ error: "Enter a valid Kenyan M-Pesa number." }, 400);
    const key = Deno.env.get("MPESA_CONSUMER_KEY"), secret = Deno.env.get("MPESA_CONSUMER_SECRET"), shortcode = Deno.env.get("MPESA_SHORTCODE"), passkey = Deno.env.get("MPESA_PASSKEY"), callbackUrl = Deno.env.get("MPESA_CALLBACK_URL"), callbackSecret = Deno.env.get("MPESA_CALLBACK_SECRET");
    if (!key || !secret || !shortcode || !passkey || !callbackUrl || !callbackSecret) return reply({ error: "M-Pesa checkout is not configured." }, 503);
    service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const amount = prices[tier as PaidTier];
    const { data: payment, error: insertError } = await service.from("mpesa_payments").insert({ user_id: user.id, tier, amount_kes: amount, phone_number: phone }).select("id").single();
    if (insertError || !payment) throw new Error("Could not create pending payment");
    paymentId = payment.id;
    const time = timestamp(), callback = new URL(callbackUrl); callback.searchParams.set("token", callbackSecret);
    const stk = await fetch(`${darajaBase}/mpesa/stkpush/v1/processrequest`, { method: "POST", headers: { Authorization: `Bearer ${await accessToken(key, secret)}`, "Content-Type": "application/json" }, body: JSON.stringify({ BusinessShortCode: shortcode, Password: btoa(`${shortcode}${passkey}${time}`), Timestamp: time, TransactionType: "CustomerPayBillOnline", Amount: amount, PartyA: phone, PartyB: shortcode, PhoneNumber: phone, CallBackURL: callback.toString(), AccountReference: `CS-${payment.id}`, TransactionDesc: `CareerSourcer ${tier} plan` }) });
    const data = await stk.json().catch(() => null), checkoutRequestId = typeof data?.CheckoutRequestID === "string" ? data.CheckoutRequestID : null, accepted = stk.ok && data?.ResponseCode === "0" && checkoutRequestId;
    await service.from("mpesa_payments").update({ merchant_request_id: typeof data?.MerchantRequestID === "string" ? data.MerchantRequestID : null, checkout_request_id: checkoutRequestId, initiation_response: data, initiation_response_code: typeof data?.ResponseCode === "string" ? data.ResponseCode : null, initiation_response_description: typeof data?.ResponseDescription === "string" ? data.ResponseDescription : null, customer_message: typeof data?.CustomerMessage === "string" ? data.CustomerMessage : null, ...(accepted ? {} : { status: "failed", result_description: "STK Push was rejected", completed_at: new Date().toISOString() }) }).eq("id", payment.id).eq("status", "pending");
    if (!accepted) return reply({ error: "M-Pesa could not send the STK Push. Please try again." }, 502);
    return reply({ checkoutRequestId, status: "pending", message: data?.CustomerMessage ?? "STK Push sent. Complete the prompt on your phone." }, 202);
  } catch (error) {
    if (service && paymentId) await service.from("mpesa_payments").update({ status: "failed", result_description: "STK initiation failed", completed_at: new Date().toISOString() }).eq("id", paymentId).eq("status", "pending");
    console.error("M-Pesa STK Push failed", error instanceof Error ? error.message : "unknown");
    return reply({ error: "M-Pesa checkout could not be started." }, 502);
  }
});
