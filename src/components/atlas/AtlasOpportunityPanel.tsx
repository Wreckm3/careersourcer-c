import { useState } from "react";
import { planOpportunity, type OpportunityDevice, type OpportunityReadiness } from "@/lib/atlas/opportunityEngine";

export function AtlasOpportunityPanel({ branchId }: { branchId: string }) {
  const [device, setDevice] = useState<OpportunityDevice>("neither");
  const [minutes, setMinutes] = useState<30 | 60 | 120>(30);
  const [internet, setInternet] = useState(false);
  const [readiness, setReadiness] = useState<OpportunityReadiness>("learning");
  const plan = planOpportunity({ branchId, device, minutes, internet, readiness });
  const field = "mt-1 w-full rounded-md border border-atlas-border bg-atlas-background p-2 text-xs text-atlas-foreground";
  return (
    <section aria-label="Atlas Opportunity Engine" className="mt-4 space-y-3 rounded-xl border border-atlas-border bg-atlas-surface/50 p-3">
      <div>
        <p className="text-[11px] font-medium uppercase text-atlas-accent">Atlas Pro · Opportunity Engine</p>
        <h3 className="mt-1 text-sm font-semibold text-atlas-foreground">Explore a practical opportunity</h3>
        <p className="mt-1 text-xs leading-5 text-atlas-muted">Start with a small experiment, not a promise of income. This uses your selected learning path and the constraints you choose. No AI credits or location permissions are used.</p>
      </div>
      <label className="block text-xs text-atlas-muted">Equipment available now
        <select className={field} value={device} onChange={(e) => setDevice(e.target.value as OpportunityDevice)}>
          <option value="neither">No device confirmed for the task</option>
          <option value="phone">Phone</option>
          <option value="computer">Computer</option>
        </select>
      </label>
      <label className="block text-xs text-atlas-muted">Time for this experiment
        <select className={field} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) as 30 | 60 | 120)}>
          <option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option>
        </select>
      </label>
      <label className="block text-xs text-atlas-muted">Where are you in your skills?
        <select className={field} value={readiness} onChange={(e) => setReadiness(e.target.value as OpportunityReadiness)}>
          <option value="learning">Still learning</option><option value="sample">I have made a sample</option><option value="reviewed">Someone has reviewed my sample</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-atlas-muted"><input type="checkbox" checked={internet} onChange={(e) => setInternet(e.target.checked)} /> Internet available for feedback</label>
      <p className="text-[11px] text-atlas-muted">Your answers are temporary, self-reported and not a certification of mastery. Select computer only if it can run the tools you need.</p>
      {plan ? (
        <div className="space-y-2 rounded-md border border-atlas-border p-3 text-xs leading-5 text-atlas-muted">
          <h4 className="font-semibold text-atlas-foreground">{plan.title}</h4>
          <p><strong>Potential audience:</strong> {plan.audience}</p>
          <p><strong>Stage:</strong> {plan.stage === "research" ? "Research first" : plan.stage === "practice" ? "Build a practice sample" : "Improve and validate your sample"}</p>
          {plan.blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}
          <p><strong>Next action:</strong> {plan.nextAction}</p>
          <p><strong>Validate the problem:</strong> {plan.demandCheck}</p>
          <p>{plan.budgetNote}</p><p>{plan.accessNote}</p>
          <p>If you are under 18, involve a trusted adult before contracts, payments or meeting strangers. Respect consent, licensing and privacy.</p>
          <p className="font-medium text-atlas-accent">{plan.source}</p>
        </div>
      ) : <p className="text-xs text-atlas-muted">No catalog entry for this learning path yet.</p>}
      <p className="text-[11px] leading-4 text-atlas-muted">Live local demand, Maps, job listings, earnings estimates and paid market analysis are not connected in this version.</p>
    </section>
  );
}
