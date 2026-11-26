import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesStkQuery, verifyStkResult } from "../supabase/functions/_shared/mpesa/stkVerification";
import {
  isMpesaTier,
  mpesaFailureStatus,
  mpesaRenewalEnd,
  mpesaTierRank,
  normalizeMpesaCallback,
  normalizeMpesaPhone,
  MPESA_PRICES,
} from "../supabase/functions/_shared/mpesa/payments";

const payment = { amount_kes: 299, phone_number: "254712345678" };

function callback(resultCode: number, resultDesc: string, amount = 299, phone: string | number = "254712345678", receipt: string | null = "ABC123") {
  return {
    Body: { stkCallback: {
      CheckoutRequestID: "wsCO_check123",
      ResultCode: resultCode,
      ResultDesc: resultDesc,
      CallbackMetadata: { Item: [
        { Name: "Amount", Value: amount },
        { Name: "PhoneNumber", Value: phone },
        ...(receipt ? [{ Name: "MpesaReceiptNumber", Value: receipt }] : []),
        { Name: "TransactionDate", Value: 20261124000100 },
      ] },
    } },
  };
}

test("uses the proposed Kenyan prices and internal tier mapping", () => {
  assert.deepEqual(MPESA_PRICES, { builder: 99, professional: 299, elite: 499 });
  assert.equal(isMpesaTier("builder"), true);
  assert.equal(isMpesaTier("creator"), false);
  assert.equal(mpesaTierRank("builder"), 1);
  assert.equal(mpesaTierRank("professional"), 2);
  assert.equal(mpesaTierRank("elite"), 3);
});

test("normalizes Kenyan phone formats and rejects invalid numbers", () => {
  assert.equal(normalizeMpesaPhone("0712345678"), "254712345678");
  assert.equal(normalizeMpesaPhone("+254712345678"), "254712345678");
  assert.equal(normalizeMpesaPhone("079999"), null);
});

test("accepts only exact verified successful callbacks", () => {
  const success = normalizeMpesaCallback(callback(0, "Success"), "wsCO_check123", payment);
  assert.equal(success.status, "success");
  assert.equal(success.amount, 299);
  assert.equal(success.receipt, "ABC123");
  assert.equal(success.phone, "254712345678");

  const wrongAmount = normalizeMpesaCallback(callback(0, "Success", 298), "wsCO_check123", payment);
  assert.equal(wrongAmount.status, "unknown");
  assert.equal(wrongAmount.receipt, null);

  const wrongPhone = normalizeMpesaCallback(callback(0, "Success", 299, "254700000000"), "wsCO_check123", payment);
  assert.equal(wrongPhone.status, "unknown");
  assert.equal(wrongPhone.receipt, null);

  assert.throws(() => normalizeMpesaCallback(callback(0, "Success"), "wrong_checkout", payment), /Invalid M-Pesa callback/);
});

test("maps failed, cancelled and timeout callbacks to distinct states", () => {
  assert.equal(mpesaFailureStatus(1, "Failed"), "failed");
  assert.equal(mpesaFailureStatus(1032, "Request cancelled"), "cancelled");
  assert.equal(mpesaFailureStatus(1037, "DS timeout"), "timeout");
  assert.equal(normalizeMpesaCallback(callback(1032, "Request cancelled"), "wsCO_check123", payment).status, "cancelled");
});

test("extends early renewals instead of resetting remaining paid time", () => {
  const now = new Date("2026-11-24T12:00:00.000Z");
  const existing = new Date("2026-12-31T12:00:00.000Z");
  const renewed = mpesaRenewalEnd(existing, now);
  assert.equal(renewed.toISOString(), "2027-01-31T12:00:00.000Z");
  assert.equal(mpesaRenewalEnd(null, now).toISOString(), "2026-12-24T12:00:00.000Z");
});

test("clamps month-end renewals and handles leap-year boundaries", () => {
  assert.equal(mpesaRenewalEnd(new Date("2028-01-31T12:00:00.000Z"), new Date("2028-01-01T12:00:00.000Z")).toISOString(),
    "2028-02-29T12:00:00.000Z");
  assert.equal(mpesaRenewalEnd(new Date("2027-01-31T12:00:00.000Z"), new Date("2027-01-01T12:00:00.000Z")).toISOString(),
    "2027-02-28T12:00:00.000Z");
});

const stkResult = { ResponseCode: "0", ResultCode: "0", CheckoutRequestID: "wsCO_check123", MerchantRequestID: "merchant-123" };

test("requires actual result code and both matching transaction identifiers", () => {
  assert.equal(matchesStkQuery(stkResult, "wsCO_check123", "merchant-123", 0), true);
  assert.equal(matchesStkQuery({ ...stkResult, ResultCode: 0 }, "wsCO_check123", "merchant-123", 0), true);
  assert.equal(matchesStkQuery({ ...stkResult, ResultCode: undefined }, "wsCO_check123", "merchant-123", 0), false);
  assert.equal(matchesStkQuery({ ...stkResult, ResultCode: "1032" }, "wsCO_check123", "merchant-123", 0), false);
  assert.equal(matchesStkQuery({ ...stkResult, ResultCode: "1032" }, "wsCO_check123", "merchant-123", 1032), true);
  assert.equal(matchesStkQuery({ ...stkResult, ResponseCode: "1" }, "wsCO_check123", "merchant-123", 0), false);
  assert.equal(matchesStkQuery(stkResult, "different", "merchant-123", 0), false);
  assert.equal(matchesStkQuery(stkResult, "wsCO_check123", "different", 0), false);
  assert.equal(matchesStkQuery({ ...stkResult, ResultCode: null }, "wsCO_check123", "merchant-123", 0), false);
});

const fixtureEnv: Record<string, string> = { MPESA_ENV: "sandbox", MPESA_CONSUMER_KEY: "fixture-key", MPESA_CONSUMER_SECRET: "fixture-secret", MPESA_SHORTCODE: "174379", MPESA_PASSKEY: "fixture-passkey" };

test("queries Daraja using stored checkout and fresh Nairobi timestamp", async () => {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const mock: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return Response.json(calls.length === 1 ? { access_token: "fixture-token" } : stkResult);
  };
  assert.equal(await verifyStkResult("wsCO_check123", "merchant-123", 0, k => fixtureEnv[k], mock, new Date("2026-11-26T12:00:00Z")), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials");
  assert.equal(calls[1].url, "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query");
  assert.equal(new Headers(calls[1].init?.headers).get("Authorization"), "Bearer fixture-token");
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), { BusinessShortCode: "174379", Password: btoa("174379fixture-passkey20261126150000"), Timestamp: "20261126150000", CheckoutRequestID: "wsCO_check123" });
});

test("fails closed on configuration errors, network failure and unverified results", async () => {
  const noCall: typeof fetch = async () => { throw new Error("must not call"); };
  assert.equal(await verifyStkResult("wsCO_check123", "merchant-123", 0, () => undefined, noCall), false);
  assert.equal(await verifyStkResult("wsCO_check123", "merchant-123", 0, k => fixtureEnv[k], noCall), false);
  const badAuth: typeof fetch = async () => new Response("unavailable", { status: 503 });
  assert.equal(await verifyStkResult("wsCO_check123", "merchant-123", 0, k => fixtureEnv[k], badAuth), false);
  const pending: typeof fetch = async input => String(input).includes("oauth") ? Response.json({ access_token: "fixture-token" }) : Response.json({ ...stkResult, ResultCode: undefined });
  assert.equal(await verifyStkResult("wsCO_check123", "merchant-123", 0, k => fixtureEnv[k], pending), false);
});
