import assert from "node:assert/strict";
import { test } from "node:test";
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
