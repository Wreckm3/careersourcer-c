import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PLANS, type Tier } from "@/lib/tiers";
import { startMpesaCheckout, type PaidTier } from "@/lib/payments";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

export default function Pricing() {
  const { user } = useAuth();
  const { tier: currentTier, refresh } = useSubscription();
  const [selected, setSelected] = useState<PaidTier>("professional");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (state !== "pending") return;
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => window.clearInterval(timer);
  }, [state, refresh]);

  useEffect(() => {
    if (state === "pending" && currentTier === selected) {
      setState("success");
      setMessage("Payment confirmed. Your subscription is now active.");
    }
  }, [currentTier, selected, state]);

  async function checkout() {
    if (!user) { setState("failed"); setMessage("Please sign in before starting checkout."); return; }
    setState("pending"); setMessage("Sending STK Push… approve the prompt on your phone.");
    try {
      const result = await startMpesaCheckout(selected, phone);
      setMessage(result.message || "STK Push sent. Complete the prompt on your phone.");
    } catch (error) {
      setState("failed");
      setMessage(error instanceof Error ? error.message : "Could not start M-Pesa checkout.");
    }
  }

  return <main className="mx-auto max-w-6xl px-6 py-16 text-foreground">
    <h1 className="text-4xl font-bold">Choose your CareerSourcer plan</h1>
    <p className="mt-3 text-muted-foreground">Secure monthly billing with M-Pesa Express.</p>
    <div className="mt-10 grid gap-6 md:grid-cols-4">
      {(Object.keys(PLANS) as Tier[]).map((id) => {
        const plan = PLANS[id]; const paid = id !== "free";
        return <button key={id} type="button" onClick={() => paid && setSelected(id as PaidTier)} className={`rounded-xl border p-6 text-left ${selected === id ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
          <h2 className="text-xl font-semibold">{plan.name}</h2><p className="mt-2 text-2xl font-bold">{plan.priceDisplay}</p><p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
          <p className="mt-4 text-sm">{currentTier === id ? "Current plan" : paid ? plan.ctaLabel : "Included"}</p>
        </button>;
      })}
    </div>
    {selected && <section className="mt-10 max-w-md rounded-xl border border-border p-6"><h2 className="text-xl font-semibold">Pay with M-Pesa</h2><label className="mt-4 block text-sm">Kenyan M-Pesa number<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" className="mt-2 w-full rounded-md border bg-background px-3 py-2" inputMode="tel" /></label><button type="button" onClick={() => void checkout()} disabled={state === "pending"} className="mt-4 w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60">{state === "pending" ? "Waiting for payment…" : `Pay KSh ${PLANS[selected].priceKes}`}</button>{message && <p className={`mt-3 text-sm ${state === "failed" ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>}{!user && <p className="mt-3 text-sm"> <Link className="underline" to="/auth">Sign in</Link> to continue.</p>}</section>}
  </main>;
}
