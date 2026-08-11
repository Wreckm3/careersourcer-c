import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/lib/tiers";

export type PaidTier = Exclude<Tier, "free">;

export async function startStripeCheckout(tier: PaidTier) {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", { body: { tier } });
  if (error) throw error;
  if (!data?.url || typeof data.url !== "string") throw new Error("Checkout could not be started. Please try again.");
  window.location.assign(data.url);
}

/** M-Pesa activation is deliberately server-confirmed; an STK prompt is not a subscription. */
export async function startMpesaCheckout(tier: PaidTier, phoneNumber: string) {
  const { data, error } = await supabase.functions.invoke("mpesa-stk-push", { body: { tier, phoneNumber } });
  if (error) throw error;
  return data as { checkoutRequestId: string; message: string };
}
