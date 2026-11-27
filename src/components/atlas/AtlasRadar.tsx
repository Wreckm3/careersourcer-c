import { useState } from "react";
import { getRadarSignals } from "@/lib/atlas/radar";
import type { OpportunityInput } from "@/lib/atlas/opportunityEngine";

/** Same temporary, self-reported constraints as the existing opportunity planner. */
export function AtlasRadar({ input }: { input: OpportunityInput }) {
  const [includeOther, setIncludeOther] = useState(false);
  const cards = getRadarSignals(input, Date.now(), includeOther);
  return (
    <div className="space-y-3 rounded-lg border border-atlas-border p-3 text-xs leading-5 text-atlas-muted">
      <div>
        <h4 className="font-semibold text-atlas-foreground">Market signals · Kenya</h4>
        <p>Curated source excerpts, not a live feed. Open the original source and confirm the facts before acting. Possible effects and experiments are hypotheses, not confirmed demand, job listings or income forecasts.</p>
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={includeOther} onChange={event => setIncludeOther(event.target.checked)} /> Explore other sectors as well</label>
      {!cards.length && <p>No reviewed signals match your path right now. Use the practice planner below or explore other sectors.</p>}
      {cards.map(card => (
        <details key={card.id} className="rounded-lg border border-atlas-border bg-atlas-background/50 p-3">
          <summary className="cursor-pointer font-medium text-atlas-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent">
            <span className="block text-[11px] font-normal text-atlas-muted">{card.sector} · {card.relevant ? "Matches your learning path" : "Other learning paths"}{card.stale ? " · Review due" : ""}</span>
            {card.title}
          </summary>
          <div className="mt-3 space-y-3 break-words">
            <div>
              <p className="font-semibold text-atlas-foreground">Reported evidence · {card.kind}</p>
              <p>{card.evidence}</p>
              <p className="text-[11px]">{card.publisher} · {card.period}</p>
              <a href={card.url} target="_blank" rel="noopener noreferrer" className="font-medium text-atlas-accent underline underline-offset-2">Read original source (opens new tab)</a>
              <p className="text-[11px]">Excerpt reviewed {card.reviewedOn}; review due {card.reviewDue}. Full article was not independently read.</p>
            </div>
            {card.stale ? <p className="rounded-md border border-atlas-border p-2">Historical signal. Recheck the source; experiments are paused until the catalogue is reviewed.</p> : <>
              <div><p className="font-semibold text-atlas-foreground">What might change</p><p>{card.possibleEffect}</p></div>
              {card.experiments.map(experiment => <div key={experiment.opportunity} className="space-y-2 rounded-md border border-atlas-border p-2">
                <p className="font-semibold text-atlas-foreground">Possible opportunity: {experiment.opportunity}</p>
                {!card.relevant && <p>Exploratory idea for another learning path; check skills before attempting it.</p>}
                <p>Sample estimate: {experiment.minutes} minutes</p>
                {experiment.blockers.map(blocker => <p key={blocker}>{blocker}</p>)}
                <p><strong>Try next:</strong> {experiment.nextAction}</p>
                <p><strong>Test the assumption:</strong> {experiment.validate}</p>
              </div>)}
            </>}
          </div>
        </details>
      ))}
      <p>No new spending is required for these experiments. Use fictional records and your existing resources. Verify actual local demand with consent; if under 18, involve a trusted adult before contracts, payments or meeting strangers. No AI, location permission, background monitoring or personal data submission is used.</p>
    </div>
  );
}
