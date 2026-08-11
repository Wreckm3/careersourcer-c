import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles, Shield, ArrowLeft, Loader2, Smartphone, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PLANS, TIER_ORDER, rank, type TierPlan } from "@/lib/tiers";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function Pricing() {
  const navigate = useNavigate();
  const { tier, isAdmin, refresh } = useSubscription();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<TierPlan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentState, setPaymentState] = useState<"idle" | "sending" | "waiting" | "success" | "error">("idle");
  const [paymentMessage, setPaymentMessage] = useState("");

  useEffect(() => {
    if (paymentState !== "waiting" || !selectedPlan) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      refresh().catch(() => {});
      if (Date.now() - startedAt > 120000) {
        window.clearInterval(interval);
        setPaymentMessage("We have not received a confirmed payment yet. Check M-Pesa, then try again if needed.");
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [paymentState, selectedPlan, refresh]);

  useEffect(() => {
    if (paymentState === "waiting" && selectedPlan && rank(tier) >= rank(selectedPlan.id)) {
      setPaymentState("success");
      setPaymentMessage(`${selectedPlan.name} is now unlocked.`);
    }
  }, [paymentState, selectedPlan, tier]);

  const choosePlan = (plan: TierPlan) => {
    if (!user) { navigate("/auth"); return; }
    setSelectedPlan(plan); setPhoneNumber(""); setPaymentState("idle"); setPaymentMessage("");
  };
  const payWithMpesa = async () => {
    if (!selectedPlan || paymentState === "sending") return;
    setPaymentState("sending"); setPaymentMessage("");
    const { data, error } = await supabase.functions.invoke("mpesa-stk-push", { body: { tier: selectedPlan.id, phoneNumber } });
    if (error || !data || typeof data !== "object" || !("checkoutRequestId" in data)) {
      const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : error?.message ?? "Could not start the M-Pesa prompt.";
      setPaymentState("error"); setPaymentMessage(message); return;
    }
    setPaymentState("waiting");
    setPaymentMessage("STK Push sent. Check your phone and enter your M-Pesa PIN. Your plan unlocks only after Safaricom confirms payment.");
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
                  disabled={current || plan.id === "free"}
                  onClick={() => plan.id !== "free" && choosePlan(plan)}
                  className={`mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    current
                      ? "bg-muted text-muted-foreground cursor-default"
                      : plan.highlight
                      ? "btn-primary-gold"
                      : "btn-secondary-blue"
                  } disabled:opacity-60`}
                >
                  {current ? "Current plan" : plan.ctaLabel}
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">Secure M-Pesa STK Push payments. Your subscription changes only after a confirmed Safaricom callback.</p>
      </div>

      <AnimatePresence>
        {selectedPlan && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-background/75 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="mpesa-title">
            <motion.div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
              <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-primary"><Smartphone className="h-4 w-4" /><span className="text-xs font-bold tracking-wider">M-PESA STK PUSH</span></div><h2 id="mpesa-title" className="mt-2 text-xl font-bold">Pay KSh {selectedPlan.priceKes} for {selectedPlan.name}</h2></div><button type="button" onClick={() => paymentState !== "sending" && setSelectedPlan(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close M-Pesa payment"><X className="h-5 w-5" /></button></div>
              {paymentState === "success" ? <div className="mt-6 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-foreground"><b className="block">Payment confirmed</b><p className="mt-1 text-muted-foreground">{paymentMessage}</p><button type="button" className="btn-primary-gold mt-4 rounded-lg px-4 py-2" onClick={() => setSelectedPlan(null)}>Done</button></div> : <><label className="mt-6 block text-sm font-medium" htmlFor="mpesa-phone">M-Pesa phone number</label><input id="mpesa-phone" type="tel" inputMode="numeric" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="0712 345 678" disabled={paymentState === "sending" || paymentState === "waiting"} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary" /><p className="mt-2 text-xs leading-5 text-muted-foreground">Use the number that will receive the M-Pesa prompt. We only use it to send this payment request.</p><button type="button" onClick={payWithMpesa} disabled={!phoneNumber.trim() || paymentState === "sending" || paymentState === "waiting"} className="btn-primary-gold mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm disabled:opacity-50">{paymentState === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending prompt...</> : paymentState === "waiting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for confirmation...</> : <>Pay KSh {selectedPlan.priceKes} via M-Pesa</>}</button>{paymentMessage && <p className={`mt-3 text-sm leading-5 ${paymentState === "error" ? "text-destructive" : "text-muted-foreground"}`}>{paymentMessage}</p>}</>}</motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
