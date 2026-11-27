export const MPESA_PRICES = {
  builder: 99,
  professional: 299,
  elite: 499,
} as const;

export type MpesaTier = keyof typeof MPESA_PRICES;
export type MpesaStatus = "pending" | "success" | "failed" | "cancelled" | "timeout" | "unknown";

export function isMpesaTier(value: unknown): value is MpesaTier {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MPESA_PRICES, value);
}

export function normalizeMpesaPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.trim().replace(/[\s()\-]/g, "");
  const match = compact.match(/^(?:\+?254|0)([17]\d{8})$/);
  return match ? `254${match[1]}` : null;
}

export function mpesaFailureStatus(resultCode: number, resultDescription: string): "cancelled" | "timeout" | "failed" {
  if (resultCode === 1032 || /cancelled|canceled/i.test(resultDescription)) return "cancelled";
  if (resultCode === 1037 || /timeout/i.test(resultDescription)) return "timeout";
  return "failed";
}

export function normalizeMpesaCallback(payload: unknown, checkoutId: string, payment: { amount_kes: number; phone_number: string }): {
  status: MpesaStatus;
  receipt: string | null;
  amount: number | null;
  phone: string | null;
  transactionDate: string | null;
  resultCode: number;
  resultDescription: string;
} {
  const body = payload && typeof payload === "object" ? payload as Record<string, any> : {};
  const callback = body.Body?.stkCallback;
  const callbackCheckoutId = typeof callback?.CheckoutRequestID === "string" ? callback.CheckoutRequestID : null;
  const resultCode = typeof callback?.ResultCode === "number" && Number.isSafeInteger(callback.ResultCode) ? callback.ResultCode : -1;
  if (callbackCheckoutId !== checkoutId || resultCode < 0) {
    throw new Error("Invalid M-Pesa callback");
  }
  const items = Array.isArray(callback.CallbackMetadata?.Item) ? callback.CallbackMetadata.Item : [];
  const value = (name: string) => items.find((item: { Name?: string }) => item?.Name === name)?.Value;
  const rawAmount = value("Amount");
  const rawPhone = value("PhoneNumber");
  const rawReceipt = value("MpesaReceiptNumber");
  const amount = typeof rawAmount === "number" && Number.isSafeInteger(rawAmount) && rawAmount >= 0 ? rawAmount : null;
  const phone = typeof rawPhone === "string" || (typeof rawPhone === "number" && Number.isSafeInteger(rawPhone))
    ? String(rawPhone)
    : null;
  const normalizedPhone = normalizeMpesaPhone(phone);
  const receipt = typeof rawReceipt === "string" && /^[A-Z0-9]+$/i.test(rawReceipt.trim()) ? rawReceipt.trim() : null;
  const rawTransactionDate = value("TransactionDate");
  const transactionDate = rawTransactionDate == null ? null : String(rawTransactionDate);
  const resultDescription = typeof callback.ResultDesc === "string" ? callback.ResultDesc : "";

  if (resultCode !== 0) {
    return { status: mpesaFailureStatus(resultCode, resultDescription), receipt: null, amount, phone: normalizedPhone, transactionDate, resultCode, resultDescription };
  }
  const verified = !!receipt && amount === payment.amount_kes && normalizedPhone === payment.phone_number;
  return {
    status: verified ? "success" : "unknown",
    receipt: verified ? receipt : null,
    amount,
    phone: normalizedPhone,
    transactionDate,
    resultCode,
    resultDescription,
  };
}

export function mpesaRenewalEnd(existingEnd: Date | null, now: Date): Date {
  const base = existingEnd && existingEnd > now ? existingEnd : now;
  const target = new Date(base);
  const originalDay = base.getUTCDate();
  const targetMonth = base.getUTCMonth() + 1;
  const targetYear = base.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  target.setUTCFullYear(targetYear, normalizedMonth, Math.min(originalDay, lastDay));
  return target;
}

export function mpesaTierRank(tier: MpesaTier): number {
  return tier === "builder" ? 1 : tier === "professional" ? 2 : 3;
}
