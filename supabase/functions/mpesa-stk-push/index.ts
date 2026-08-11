import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Tier = "builder" | "creator" | "visionary";
type PaymentStatus = "pending" | "success" | "failed" | "cancelled" | "timeout" | "unknown";

const plans: Record<Tier, number> = { builder: 99, creator: 299, visionary: 499 };
const localOrigins = ["http://localhost:5173", "http://localhost:4173"];
const json = (body: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

function cors(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const configured = Deno.env.get("APP_ORIGIN")?.split(",").map(item => item.trim()) ?? [];
  const allowed = [...localOrigins, ...configured];
  return { "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : localOrigins[0], "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase service configuration is missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function required(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured.`); return value; }
function phoneNumber(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? `254${digits.slice(1)}` : digits.startsWith("7") || digits.startsWith("1") ? `254${digits}` : digits;
  return /^254[71]\d{8}$/.test(normalized) ? normalized : null;
}
function eatTimestamp(now = new Date()) { return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/[-:TZ.]/g, "").slice(0, 14); }
function resultStatus(code: number): PaymentStatus { if (code === 0) return "success"; if (code === 1032) return "cancelled"; if (code === 1037) return "timeout"; if ([1, 17, 2001].includes(code)) return "failed"; return "unknown"; }

async function accessToken(baseUrl: string) {
  const credentials = btoa(`${required("MPESA_CONSUMER_KEY")}:${required("MPESA_CONSUMER_SECRET")}`);
  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${credentials}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.access_token !== "string") throw new Error("Could not authenticate with Safaricom Daraja.");
  return body.access_token as string;
}

async function startStk(request: Request) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Please sign in before starting a payment." }, 401, cors(request));
  const client = serviceClient();
  const { data: auth, error: authError } = await client.auth.getUser(token);
  if (authError || !auth.user) return json({ error: "Your session is invalid. Please sign in again." }, 401, cors(request));
  const input = await request.json().catch(() => ({}));
  const tier = input.tier as Tier; const phone = phoneNumber(input.phoneNumber);
  if (!Object.prototype.hasOwnProperty.call(plans, tier)) return json({ error: "That subscription plan cannot be paid for with M-Pesa." }, 400, cors(request));
  if (!phone) return json({ error: "Enter a valid Kenyan M-Pesa number, for example 0712 345 678." }, 400, cors(request));
  const amount = plans[tier]; // The requested price is never accepted from the browser.
  const { data: payment, error: insertError } = await client.from("mpesa_payments").insert({ user_id: auth.user.id, tier, amount_kes: amount, phone_number: phone }).select("id").single();
  if (insertError || !payment) return json({ error: "Could not start the payment. Please try again." }, 500, cors(request));
  try {
    const baseUrl = Deno.env.get("MPESA_ENVIRONMENT") === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
    const shortcode = required("MPESA_SHORTCODE"); const timestamp = eatTimestamp();
    const password = btoa(`${shortcode}${required("MPESA_PASSKEY")}${timestamp}`);
    const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, { method: "POST", headers: { Authorization: `Bearer ${await accessToken(baseUrl)}`, "Content-Type": "application/json" }, body: JSON.stringify({ BusinessShortCode: shortcode, Password: password, Timestamp: timestamp, TransactionType: "CustomerPayBillOnline", Amount: amount, PartyA: phone, PartyB: shortcode, PhoneNumber: phone, CallBackURL: required("MPESA_CALLBACK_URL"), AccountReference: `CS-${payment.id}`, TransactionDesc: `CareerSourcer ${tier} subscription` }) });
    const daraja = await response.json().catch(() => ({}));
    if (!response.ok || daraja.ResponseCode !== "0" || !daraja.CheckoutRequestID) throw new Error(typeof daraja.errorMessage === "string" ? daraja.errorMessage : "Safaricom could not start the STK Push.");
    const { error: updateError } = await client.from("mpesa_payments").update({ merchant_request_id: daraja.MerchantRequestID, checkout_request_id: daraja.CheckoutRequestID }).eq("id", payment.id).eq("status", "pending");
    if (updateError) throw new Error("Could not save the M-Pesa request.");
    return json({ checkoutRequestId: daraja.CheckoutRequestID, amount, message: "Check your phone and enter your M-Pesa PIN to confirm." }, 200, cors(request));
  } catch (caught) {
    await client.from("mpesa_payments").update({ status: "failed", result_description: caught instanceof Error ? caught.message : "STK Push failed to start", completed_at: new Date().toISOString() }).eq("id", payment.id).eq("status", "pending");
    return json({ error: caught instanceof Error ? caught.message : "Could not start the STK Push." }, 502, cors(request));
  }
}

async function callback(request: Request, url: URL) {
  // Daraja does not sign callbacks. The callback URL must include an unpredictable token stored only as a secret.
  if (url.searchParams.get("token") !== required("MPESA_CALLBACK_TOKEN")) return json({ ResultCode: 1, ResultDesc: "Unauthorized callback" }, 401);
  const payload = await request.json().catch(() => null) as { Body?: { stkCallback?: Record<string, unknown> } } | null;
  const event = payload?.Body?.stkCallback; const checkoutId = event?.CheckoutRequestID; const code = event?.ResultCode;
  if (typeof checkoutId !== "string" || typeof code !== "number") return json({ ResultCode: 1, ResultDesc: "Malformed callback" }, 400);
  const client = serviceClient();
  const { data: payment } = await client.from("mpesa_payments").select("id,user_id,tier,amount_kes,phone_number").eq("checkout_request_id", checkoutId).maybeSingle();
  if (!payment) return json({ ResultCode: 0, ResultDesc: "Acknowledged" });
  const items = ((event.CallbackMetadata as { Item?: Array<{ Name?: string; Value?: unknown }> } | undefined)?.Item ?? []);
  const metadata = Object.fromEntries(items.map(item => [item.Name ?? "", item.Value]));
  const status = resultStatus(code); const amount = Number(metadata.Amount); const phone = phoneNumber(metadata.PhoneNumber); const receipt = typeof metadata.MpesaReceiptNumber === "string" ? metadata.MpesaReceiptNumber : null;
  const confirmed = status === "success" && amount === payment.amount_kes && phone === payment.phone_number && !!receipt;
  const finalStatus: PaymentStatus = status === "success" && !confirmed ? "unknown" : status;
  const { data: settled, error } = await client.rpc("finalize_mpesa_payment", { _payment_id: payment.id, _status: finalStatus, _receipt: confirmed ? receipt : null, _result_code: code, _result_description: typeof event.ResultDesc === "string" ? event.ResultDesc : null, _callback_payload: payload });
  if (error || !settled) return json({ ResultCode: 0, ResultDesc: "Acknowledged" }); // Atomic pending guard makes callback retries harmless.
  return json({ ResultCode: 0, ResultDesc: "Accepted" });
}

Deno.serve(async request => {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(request) });
  try {
    if (url.pathname.endsWith("/callback")) return await callback(request, url);
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, cors(request));
    return await startStk(request);
  } catch (error) { console.error("M-Pesa function error", error); return json({ error: "The payment service is temporarily unavailable." }, 500, cors(request)); }
});
