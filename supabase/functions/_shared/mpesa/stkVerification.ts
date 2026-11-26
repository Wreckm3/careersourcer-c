// Daraja STK Push Query confirms the outcome of a previously initiated checkout.
// It is NOT independent verification of receipt, amount or phone metadata.
// A successful query must accompany (not replace) the existing callback checks.
export type MpesaEnvReader = (name: string) => string | undefined;
type Fetcher = typeof fetch;

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function resultCode(value: unknown): number | null {
  if (typeof value === "string" && /^\d+$/.test(value)) value = Number(value);
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function matchesStkQuery(payload: unknown, checkoutId: string, merchantId: string, expectedCode: number): boolean {
  const data = object(payload);
  return !!data && !!checkoutId && !!merchantId && resultCode(data.ResponseCode) === 0
    && data.CheckoutRequestID === checkoutId && data.MerchantRequestID === merchantId
    && resultCode(data.ResultCode) !== null && resultCode(data.ResultCode) === expectedCode;
}

function timestamp(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

export async function verifyStkResult(checkoutId: string, merchantId: string, expectedCode: number,
  env: MpesaEnvReader, fetcher: Fetcher = fetch, now: Date = new Date()): Promise<boolean> {
  const environment = env("MPESA_ENV");
  // Require the deployment environment to be explicit. Never fall back to a
  // sandbox verification on a misconfigured production deployment.
  if (environment !== "sandbox" && environment !== "production") return false;
  const base = environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  const key = env("MPESA_CONSUMER_KEY"), secret = env("MPESA_CONSUMER_SECRET");
  const shortcode = env("MPESA_SHORTCODE"), passkey = env("MPESA_PASSKEY");
  if (!key || !secret || !shortcode || !passkey || !checkoutId || !merchantId) return false;
  if (!Number.isSafeInteger(expectedCode) || expectedCode < 0) return false;
  try {
    const signal = AbortSignal.timeout(10000);
    const oauth = await fetcher(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` }, signal, redirect: "error",
    });
    if (!oauth.ok) return false;
    const auth = object(await oauth.json());
    if (typeof auth?.access_token !== "string" || !auth.access_token) return false;
    const time = timestamp(now);
    const query = await fetcher(`${base}/mpesa/stkpushquery/v1/query`, {
      method: "POST", redirect: "error", signal,
      headers: { Authorization: `Bearer ${auth.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ BusinessShortCode: shortcode, Password: btoa(`${shortcode}${passkey}${time}`), Timestamp: time, CheckoutRequestID: checkoutId }),
    });
    return query.ok && matchesStkQuery(await query.json(), checkoutId, merchantId, expectedCode);
  } catch {
    // No credentials, provider bodies or callback details in logs.
    return false;
  }
}
