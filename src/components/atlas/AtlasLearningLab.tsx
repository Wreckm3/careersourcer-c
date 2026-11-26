import { useState } from "react";
import { Button } from "@/components/ui/button";
import { emptyLabDraft, formatLabEvidence, LAB_FIELDS } from "@/lib/atlas/learningLab";

interface LearningLabProps {
  lesson: { title: string; objective: string; exercise: string; mission: string; completionCriteria: string };
  busy: boolean;
  onPrepareEvidence: (evidence: string) => void;
}

export function AtlasLearningLab({ lesson, busy, onPrepareEvidence }: LearningLabProps) {
  const [draft, setDraft] = useState(emptyLabDraft);
  const [step, setStep] = useState(0);
  const [prepared, setPrepared] = useState(false);
  const field = LAB_FIELDS[step];
  const evidence = formatLabEvidence(draft);
  const currentValid = !!draft[field.key].trim() && draft[field.key].trim().length <= field.maxLength;

  return (
    <section aria-label="Atlas Learning Lab" className="space-y-3 rounded-xl border border-atlas-border bg-atlas-surface/50 p-3">
      <div>
        <p className="text-[11px] font-medium uppercase text-atlas-accent">Learning Lab</p>
        <h3 className="mt-1 text-sm font-semibold text-atlas-foreground">{lesson.title}</h3>
        <p className="mt-1 text-xs leading-5 text-atlas-muted">Practise independently using your approved StudyFlow. No AI credits are used to complete this activity.</p>
      </div>
      <div className="space-y-2 rounded-md border border-atlas-border p-2 text-xs leading-5 text-atlas-muted">
        <p><strong className="text-atlas-foreground">Objective:</strong> {lesson.objective}</p>
        <p><strong className="text-atlas-foreground">Exercise:</strong> {lesson.exercise}</p>
        <p><strong className="text-atlas-foreground">Challenge:</strong> {lesson.mission}</p>
        <p><strong className="text-atlas-foreground">Check your work against:</strong> {lesson.completionCriteria}</p>
      </div>
      <div className="grid grid-cols-4 gap-1" aria-label="Practice steps">
        {LAB_FIELDS.map((item, index) => (
          <button key={item.key} type="button" aria-label={`Step ${index + 1}: ${item.title}`} aria-current={index === step ? "step" : undefined}
            onClick={() => setStep(index)} className={`rounded-md border px-1 py-2 text-xs ${index === step ? "border-atlas-accent text-atlas-foreground" : "border-atlas-border text-atlas-muted"}`}>
            {index + 1}{draft[item.key].trim() ? " ✓" : ""}
          </button>
        ))}
      </div>
      <label className="block space-y-1 text-xs text-atlas-foreground">
        <span className="font-semibold">{step + 1}. {field.title}</span>
        <span className="block text-atlas-muted">{field.prompt}</span>
        <textarea className="min-h-24 w-full resize-y rounded-md border border-atlas-border bg-atlas-background p-2 outline-none focus:ring-1 focus:ring-atlas-accent"
          value={draft[field.key]} maxLength={field.maxLength} onChange={(event) => {
            setDraft((previous) => ({ ...previous, [field.key]: event.target.value }));
            setPrepared(false);
          }} />
        <span className="block text-[11px] text-atlas-muted">{draft[field.key].length}/{field.maxLength}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={step === 0} onClick={() => setStep((previous) => previous - 1)}>Back</Button>
        {step < LAB_FIELDS.length - 1 ? (
          <Button type="button" size="sm" variant="outline" disabled={!currentValid} onClick={() => setStep((previous) => previous + 1)}>Next</Button>
        ) : (
          <Button type="button" size="sm" disabled={busy || !evidence} onClick={() => {
            if (!evidence) return;
            onPrepareEvidence(evidence);
            setPrepared(true);
          }}>Prepare evidence</Button>
        )}
      </div>
      {prepared && <p role="status" className="text-xs text-atlas-accent">Evidence draft prepared below. Review it and submit it to save your work.</p>}
      <p className="text-[11px] leading-4 text-atlas-muted">Practice drafts are temporary until submitted. Do not include passwords, private keys or confidential work. Completing these steps is not a mastery score. An optional Atlas assessment uses existing credits.</p>
    </section>
  );
}
