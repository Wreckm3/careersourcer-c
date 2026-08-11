﻿import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const AMOUNTS = { builder: 99, professional: 299, elite: 499 } as const;

function kenyaTimestamp() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}${part("month")}${part("day")}${part("hour")}${part("minute")}${part("second")}`;
}

function normalizedPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^07\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^7\d{8}$/.test(digits)) return `254${digits}`;
  if (/^2547\d{8}$/.test(digits)) return digits;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }, auth: { persistSession: false } });
    const { data: { user } } = await supabase.auth.getUser();
    const { tier, phoneNumber } = await req.json();
    const phone = typeof phoneNumber === "string" ? normalizedPhone(phoneNumber) : null;
    if (!user) return Response.json({ error: "Sign in before upgrading." }, { status: 401, headers: corsHeaders });
    if (!(tier in AMOUNTS) || !phone) return Response.json({ error: "Use a valid Kenyan M-Pesa number." }, { status: 400, headers: corsHeaders });

    const key = Deno.env.get("MPESA_CONSUMER_KEY"), secret = Deno.env.get("MPESA_CONSUMER_SECRET"), shortcode = Deno.env.get("MPESA_SHORTCODE"), passkey = Deno.env.get("MPESA_PASSKEY"), callbackUrl = Deno.env.get("MPESA_CALLBACK_URL"), callbackSecret = Deno.env.get("MPESA_CALLBACK_SECRET");
    if (!key || !secret || !shortcode || !passkey || !callbackUrl || !callbackSecret) return Response.json({ error: "M-Pesa is not configured yet." }, { status: 503, headers: corsHeaders });

    const baseUrl = Deno.env.get("MPESA_ENV") === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` } });
    const tokenJson = await tokenResponse.json();
    const token = tokenJson?.access_token;
    if (!token) throw new Error("Daraja token request failed");

    const timestamp = kenyaTimestamp();
    const password = btoa(`${shortcode}${passkey}${timestamp}`);
    const callback = new URL(callbackUrl);
    callback.searchParams.set("token", callbackSecret);

    const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: AMOUNTS[tier as keyof typeof AMOUNTS],
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callback.toString(),
        AccountReference: `CareerSourcer ${tier}`,
        TransactionDesc: `CareerSourcer ${tier} plan`
      })
    });

    const data = await response.json();
    if (!response.ok || data.ResponseCode !== "0" || !data.CheckoutRequestID) return Response.json({ error: data.errorMessage ?? data.ResponseDescription ?? "M-Pesa could not start the payment." }, { status: 502, headers: corsHeaders });

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    await service.from("payment_transactions").insert({ user_id: user.id, provider: "mpesa", tier, amount_kes: AMOUNTS[tier as keyof typeof AMOUNTS], provider_reference: data.CheckoutRequestID, metadata: { merchantRequestId: data.MerchantRequestID, phoneLastFour: phone.slice(-4) } });

    return Response.json({ checkoutRequestId: data.CheckoutRequestID, message: data.CustomerMessage ?? "Confirm the M-Pesa prompt on your phone." }, { headers: corsHeaders });
  } catch (error) {
    console.error("M-Pesa STK push failed", error);
    return Response.json({ error: "M-Pesa could not start the payment." }, { status: 500, headers: corsHeaders });
  }
});

