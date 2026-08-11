﻿import { motion } from "framer-motion";
import { useState } from "react";
import { Check, Sparkles, Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { PLANS, TIER_ORDER } from "@/lib/tiers";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { startStripeCheckout } from "@/lib/payments";

export default function Pricing() {
  const { tier, isAdmin } = useSubscription();
  const { user } = useAuth();
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const checkout = async (planId: Exclude<typeof TIER_ORDER[number], "free">) => {
    if (!user) {
      window.location.assign("/auth");
      return;
    }
    setCheckoutError(null);
    setCheckingOut(planId);
    try {
      await startStripeCheckout(planId);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Checkout could not be started.");
      setCheckingOut(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-16 px-6">
      <Link
        to="/"
        className="absolute top-5 left-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="max-w-6xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs font-semibold text-primary mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Choose your plan
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-foreground">
            Learn free. Build faster with Atlas.
          </h1>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Every plan is built to help you ship real projects. Upgrade only when the mentorship pays for itself.
          </p>
          {isAdmin && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" /> Admin — all tiers unlocked
            </div>
          )}
        </motion.header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIER_ORDER.map((id, idx) => {
            const plan = PLANS[id];
            const current = plan.id === tier;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                className={`surface-card card-interactive p-6 flex flex-col ${
                  plan.highlight ? "ring-1 ring-primary/50 gold-glow" : ""
                }`}
              >
                {plan.highlight && (
                  <span className="self-start text-[10px] font-bold uppercase tracking-widest text-primary mb-3">
                    Most popular
                  </span>
                )}
                <h2 className="font-display text-2xl font-bold">{plan.name}</h2>
                <p className="text-sm text-muted-foreground mt-1 min-h-[2.5rem]">{plan.tagline}</p>

                <div className="mt-5 mb-5">
                  <div className="text-3xl font-black text-foreground">{plan.priceDisplay}</div>
                </div>

                <ul className="flex-1 space-y-2.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-foreground/90">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={current || plan.id === "free" || checkingOut !== null}
                  onClick={() => plan.id !== "free" && checkout(plan.id)}
                  className={`mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    current
                      ? "bg-muted text-muted-foreground cursor-default"
                      : plan.highlight
                      ? "btn-primary-gold"
                      : "btn-secondary-blue"
                  } disabled:opacity-60`}
                  title={plan.id !== "free" ? "Pay securely by card with Stripe" : undefined}
                >
                  {current ? "Current plan" : checkingOut === plan.id ? "Opening secure checkout…" : plan.ctaLabel}
                </button>
              </motion.div>
            );
          })}
        </div>

        {checkoutError && <p className="text-center text-sm text-destructive mt-6">{checkoutError}</p>}
        <p className="text-center text-xs text-muted-foreground mt-10">
          Card payments use Stripe Checkout (Visa and Mastercard where enabled on your merchant account). M-Pesa requires the separate Daraja configuration described in deployment notes.
        </p>
      </div>
    </div>
  );
}

