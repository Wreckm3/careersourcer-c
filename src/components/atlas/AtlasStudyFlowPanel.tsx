import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, Compass, Loader2, RotateCcw, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fromStudyFlowLines,
  toStudyFlowLines,
  type AtlasStudyFlowEvidence,
  type AtlasStudyFlowAssessmentRecord,
  type AtlasStudyFlowRecord,
  type AtlasStudyProfile,
} from "@/lib/atlas/studyFlow";

interface AtlasStudyFlowPanelProps {
  branchId: string | null;
  branchTitle: string | null;
  profile: AtlasStudyProfile;
  flow: AtlasStudyFlowRecord | null;
  evidence: AtlasStudyFlowEvidence[];
  assessments: AtlasStudyFlowAssessmentRecord[];
  busy: boolean;
  error: string | null;
  onSaveProfile: (profile: AtlasStudyProfile) => void;
  onGenerate: (operation: "generate" | "revise", instruction: string) => void;
  onApprove: () => void;
  onSubmitEvidence: (itemId: string, evidence: string) => void;
  onAssessEvidence: (evidenceId: string) => void;
  onPrompt: (prompt: string) => void;
}

function splitEvidenceByItem(evidence: AtlasStudyFlowEvidence[]) {
  const grouped = new Map<string, AtlasStudyFlowEvidence[]>();
  for (const entry of evidence) {
    const group = grouped.get(entry.item_id) ?? [];
    group.push(entry);
    grouped.set(entry.item_id, group);
  }
  return grouped;
}

export function AtlasStudyFlowPanel({
  branchId,
  branchTitle,
  profile,
  flow,
  evidence,
  assessments,
  busy,
  error,
  onSaveProfile,
  onGenerate,
  onApprove,
  onSubmitEvidence,
  onAssessEvidence,
  onPrompt,
}: AtlasStudyFlowPanelProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState(profile);
  const [goal, setGoal] = useState("");
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, string>>({});
  useEffect(() => setProfileDraft(profile), [profile]);
  const roadmap = flow?.active_roadmap ?? null;
  const proposal = flow?.proposed_roadmap ?? null;
  const submittedEvidence = useMemo(() => splitEvidenceByItem(evidence), [evidence]);
  const lessons = roadmap?.objectives.flatMap((objective) =>
    objective.stages.flatMap((stage) => stage.lessons.map((lesson) => ({
      objective: objective.title,
      stage: stage.title,
      lesson,
    }))),
  ) ?? [];
  const assessedLessonIds = useMemo(() => {
    const latestEvidence = new Map<string, AtlasStudyFlowEvidence>();
    for (const entry of evidence) {
      const key = `${entry.roadmap_revision}:${entry.item_id}`;
      if (!latestEvidence.has(key)) latestEvidence.set(key, entry);
    }
    const latestAssessment = new Map<string, AtlasStudyFlowAssessmentRecord>();
    for (const assessment of assessments) {
      if (!latestAssessment.has(assessment.evidence_id)) latestAssessment.set(assessment.evidence_id, assessment);
    }
    return new Set([...latestEvidence.values()]
      .filter((entry) =>
        entry.roadmap_revision === flow?.revision &&
        latestAssessment.get(entry.id)?.decision === "criteria_met"
      )
      .map((entry) => entry.item_id));
  }, [assessments, evidence, flow?.revision]);
  const nextLesson = lessons.find(({ lesson }) =>
    !assessedLessonIds.has(lesson.id) &&
    lesson.prerequisites.every((prerequisite) => assessedLessonIds.has(prerequisite)),
  ) ?? lessons.find(({ lesson }) => !assessedLessonIds.has(lesson.id));

  if (!branchId || !branchTitle) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-atlas-foreground">Choose a learning path to begin</p>
        <p className="text-xs leading-5 text-atlas-muted">Atlas can help you explore a direction and save a personal roadmap for the path you choose.</p>
        <Button asChild size="sm" className="bg-atlas-accent text-atlas-button-foreground hover:bg-atlas-accent/90">
          <Link to="/paths">Explore learning paths</Link>
        </Button>
      </div>
    );
  }

  const profileText = (values: string[]) => fromStudyFlowLines(values);
  const updateList = (key: keyof AtlasStudyProfile, value: string) => {
    if (key === "budgetConstraint" || key === "timeConstraint") return;
    setProfileDraft((previous) => ({ ...previous, [key]: toStudyFlowLines(value) }));
  };

  const discoveryChoices = [
    { title: "I have a clear goal", prompt: `I have a clear goal for ${branchTitle}. Ask me a couple of focused questions so you can shape the roadmap around what I want to achieve.` },
    { title: "I have a rough idea", prompt: `I have a rough idea about what I want to do in ${branchTitle}, but I need help making it specific. Help me explore practical directions without assuming I need to build a product.` },
    { title: "I'm not sure yet", prompt: `I am not sure what direction to take in ${branchTitle}. Help me discover what interests me through a few relevant questions and examples, without forcing a product idea.` },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-atlas-border bg-atlas-surface/50 p-3">
        <div className="flex items-start gap-2">
          <Compass className="mt-0.5 h-4 w-4 shrink-0 text-atlas-accent" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-atlas-foreground">{roadmap ? "Resume your StudyFlow" : `Discover ${branchTitle}`}</p>
            <p className="mt-1 text-xs leading-5 text-atlas-muted">
              {roadmap
                ? "Your approved roadmap and submitted evidence stay saved when you return."
                : "Choose what best describes your direction. Atlas will adapt its questions to this path."}
            </p>
          </div>
        </div>
        {!roadmap && (
          <div className="mt-3 space-y-1">
            {discoveryChoices.map((choice) => (
              <Button
                key={choice.title}
                type="button"
                variant="ghost"
                className="h-auto min-h-9 w-full justify-start whitespace-normal px-2 py-2 text-left text-xs text-atlas-muted hover:bg-atlas-sidebar hover:text-atlas-foreground"
                onClick={() => onPrompt(choice.prompt)}
              >
                {choice.title}
              </Button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase text-atlas-muted">Learner profile</p>
            <p className="mt-1 text-xs text-atlas-muted">Add details over time; you can review or correct them.</p>
          </div>
          <Button type="button" variant="link" className="h-auto p-0 text-xs text-atlas-accent" onClick={() => setProfileOpen((open) => !open)}>
            {profileOpen ? "Close" : "Review"}
          </Button>
        </div>
        {profileOpen && (
          <div className="space-y-3 rounded-xl border border-atlas-border p-3">
            {([
              ["interests", "Interests"],
              ["ambitions", "Ambitions or goals"],
              ["existingKnowledge", "What you already know"],
              ["equipment", "Available equipment"],
              ["software", "Software you can use"],
              ["preferredGoals", "Preferred outcomes"],
              ["helpfulApproaches", "Teaching approaches that help"],
              ["currentDifficulties", "Current difficulties"],
              ["longTermObjectives", "Long-term objectives"],
            ] as const).map(([key, label]) => (
              <label key={key} className="block text-xs font-medium text-atlas-muted">
                {label}
                <textarea
                  className="mt-1 min-h-14 w-full resize-y rounded-md border border-atlas-border bg-atlas-background px-2 py-1.5 text-xs text-atlas-foreground outline-none focus:ring-1 focus:ring-atlas-accent"
                  value={profileText(profileDraft[key])}
                  onChange={(event) => updateList(key, event.target.value)}
                  maxLength={1200}
                />
              </label>
            ))}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([
                ["budgetConstraint", "Budget or access constraints"],
                ["timeConstraint", "Time available"],
              ] as const).map(([key, label]) => (
                <label key={key} className="text-xs font-medium text-atlas-muted">
                  {label}
                  <input
                    className="mt-1 w-full rounded-md border border-atlas-border bg-atlas-background px-2 py-1.5 text-xs text-atlas-foreground outline-none focus:ring-1 focus:ring-atlas-accent"
                    value={profileDraft[key]}
                    maxLength={240}
                    onChange={(event) => setProfileDraft((previous) => ({ ...previous, [key]: event.target.value }))}
                  />
                </label>
              ))}
            </div>
            <Button type="button" size="sm" variant="outline" className="w-full border-atlas-border bg-transparent text-atlas-foreground" disabled={busy} onClick={() => onSaveProfile(profileDraft)}>
              Save learner profile
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-medium uppercase text-atlas-muted">{roadmap ? "Adjust your direction" : "Personalized roadmap"}</p>
        <textarea
          className="min-h-20 w-full resize-y rounded-md border border-atlas-border bg-atlas-background px-2.5 py-2 text-xs text-atlas-foreground outline-none focus:ring-1 focus:ring-atlas-accent"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          maxLength={1200}
          placeholder={roadmap ? "Tell Atlas what changed or what you want to improve." : `What would you like to explore in ${branchTitle}?`}
          aria-label="StudyFlow goal or revision"
        />
        <Button
          type="button"
          size="sm"
          className="w-full bg-atlas-accent text-atlas-button-foreground hover:bg-atlas-accent/90"
          disabled={busy || goal.trim().length < 3}
          onClick={() => onGenerate(roadmap ? "revise" : "generate", goal.trim())}
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {roadmap ? "Propose a roadmap revision" : "Ask Atlas to design my StudyFlow"}
        </Button>
        <p className="text-[11px] leading-4 text-atlas-muted">This uses your existing metered Atlas request and saves a draft for your approval.</p>
      </section>

      {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}

      {proposal && (
        <section className="space-y-3 rounded-xl border border-atlas-accent/40 bg-atlas-surface/60 p-3">
          <div>
            <p className="text-[11px] font-medium uppercase text-atlas-accent">Draft for your review</p>
            <h3 className="mt-1 text-sm font-semibold text-atlas-foreground">{proposal.title}</h3>
            <p className="mt-1 text-xs leading-5 text-atlas-muted">{proposal.direction}</p>
          </div>
          <ObjectiveList roadmap={proposal} />
          <Button type="button" size="sm" className="w-full bg-atlas-accent text-atlas-button-foreground hover:bg-atlas-accent/90" disabled={busy} onClick={onApprove}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve this roadmap
          </Button>
        </section>
      )}

      {roadmap && (
        <section className="space-y-3">
          <div className="rounded-xl border border-atlas-border p-3">
            <p className="text-[11px] font-medium uppercase text-atlas-muted">Current learning objective</p>
            <h3 className="mt-1 text-sm font-semibold text-atlas-foreground">{roadmap.title}</h3>
            <p className="mt-1 text-xs leading-5 text-atlas-muted">{roadmap.direction}</p>
            <p className="mt-2 text-xs text-atlas-muted">
              {assessedLessonIds.size} of {lessons.length} lessons have evidence assessed as meeting criteria. Submission alone is not marked as completion.
            </p>
            <p className="mt-3 text-xs font-semibold text-atlas-foreground">
              {nextLesson ? `Next action · ${nextLesson.lesson.title}` : "Current roadmap criteria met"}
            </p>
            <p className="mt-1 text-xs leading-5 text-atlas-muted">
              {nextLesson ? nextLesson.lesson.exercise : "Review your next direction with Atlas or adjust your roadmap when your goals change."}
            </p>
            <Button type="button" variant="link" className="mt-2 h-auto p-0 text-xs text-atlas-accent" onClick={() => onPrompt(`Resume my saved StudyFlow for ${branchTitle}. My next action is: ${nextLesson?.lesson.exercise ?? roadmap.nextAction.description}. Help me start without repeating discovery.`)}>
              Resume mentorship <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
            {flow.roadmap_history.length > 0 && (
              <details className="mt-3 border-t border-atlas-border pt-2">
                <summary className="cursor-pointer text-xs font-medium text-atlas-muted">
                  Previous roadmap versions ({flow.roadmap_history.length})
                </summary>
                <ul className="mt-2 space-y-2">
                  {flow.roadmap_history.slice().reverse().map((previous) => (
                    <li key={`${previous.revision}-${previous.preservedAt}`} className="text-xs">
                      <p className="font-medium text-atlas-foreground">{previous.approvedRoadmap.title}</p>
                      <p className="mt-0.5 text-atlas-muted">Revision {previous.revision} · {previous.approvedRoadmap.direction}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] leading-4 text-atlas-muted">
                  Earlier roadmaps and submitted evidence are retained when your direction changes.
                </p>
              </details>
            )}
          </div>
          <ObjectiveList roadmap={roadmap} assessedLessonIds={assessedLessonIds} />
          <div className="rounded-xl border border-atlas-border p-3">
            <p className="text-xs font-semibold text-atlas-foreground">If you get stuck</p>
            <p className="mt-1 text-xs leading-5 text-atlas-muted">{roadmap.recoveryHint}</p>
            <Button type="button" variant="link" className="mt-1 h-auto p-0 text-xs text-atlas-accent" onClick={() => onPrompt(`I am stuck in my ${branchTitle} StudyFlow. Use this saved recovery guidance: ${roadmap.recoveryHint} Ask what is blocking me and suggest one accessible next step.`)}>
              Get recovery help <RotateCcw className="ml-1 h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase text-atlas-muted">Lessons and evidence</p>
            {lessons.map(({ objective, stage, lesson }) => {
              const priorEvidence = submittedEvidence.get(lesson.id) ?? [];
              const draft = evidenceDrafts[lesson.id] ?? "";
              return (
                <article key={lesson.id} className="rounded-xl border border-atlas-border p-3">
                  <p className="text-[10px] uppercase text-atlas-muted">{objective} · {stage}</p>
                  <h4 className="mt-1 text-xs font-semibold text-atlas-foreground">{lesson.title}</h4>
                  <p className="mt-1 text-xs leading-5 text-atlas-muted">{lesson.objective}</p>
                  <p className="mt-2 text-xs text-atlas-foreground"><strong>Practice:</strong> {lesson.exercise}</p>
                  <p className="mt-1 text-xs text-atlas-muted"><strong>Mission:</strong> {lesson.mission}</p>
                  <p className="mt-1 text-xs text-atlas-muted"><strong>Evidence to show:</strong> {lesson.completionCriteria}</p>
                  {(() => {
                    const latestEvidence = priorEvidence[0];
                    const assessment = latestEvidence && assessments.find((item) => item.evidence_id === latestEvidence.id);
                    const status = latestEvidence && latestEvidence.roadmap_revision !== flow?.revision
                      ? "Evidence from an earlier roadmap · current criteria not assessed"
                      : assessment?.decision === "criteria_met"
                      ? "Criteria met in Atlas assessment"
                      : assessment?.decision === "developing"
                        ? "Assessment: more practice suggested"
                        : assessment?.decision === "needs_practice"
                          ? "Assessment: more evidence or practice needed"
                          : latestEvidence ? "Evidence submitted · not assessed" : "Not started";
                    return <p className="mt-2 text-[11px] font-medium text-atlas-accent">{status}</p>;
                  })()}
                  {lesson.resource && (
                    <div className="mt-2 rounded-md bg-atlas-surface p-2 text-xs text-atlas-muted">
                      <p className="flex items-center gap-1 font-medium text-atlas-foreground"><BookOpen className="h-3 w-3" /> {lesson.resource.title}</p>
                      <p className="mt-1">{lesson.resource.why}</p>
                      <p className="mt-1">Observe: {lesson.resource.observe}</p>
                      <p className="mt-1">Afterward: {lesson.resource.doAfter}</p>
                      <p className="mt-1">Contribution: {lesson.resource.objectiveContribution}</p>
                      <p className="mt-1 italic">No verified link is available.</p>
                    </div>
                  )}
                  {priorEvidence.length > 0 && (
                    <div className="mt-2 rounded-md border border-atlas-border p-2 text-xs text-atlas-muted">
                      <p className="font-medium text-atlas-foreground">Your submitted evidence</p>
                      <p className="mt-1">{priorEvidence[0].evidence_text}</p>
                      {(() => {
                        const assessment = assessments.find((item) => item.evidence_id === priorEvidence[0].id);
                        return assessment ? (
                          <div className="mt-2 border-t border-atlas-border pt-2">
                            <p className="font-medium text-atlas-foreground">
                              Atlas assessment · {assessment.decision.replaceAll("_", " ")}
                            </p>
                            <p className="mt-1">{assessment.feedback}</p>
                            {assessment.criteriaMet.length > 0 && <p className="mt-1">Shown: {assessment.criteriaMet.join("; ")}</p>}
                            {assessment.remainingGaps.length > 0 && <p className="mt-1">Still to practise: {assessment.remainingGaps.join("; ")}</p>}
                            <p className="mt-1 font-medium">Next: {assessment.nextStep}</p>
                          </div>
                        ) : priorEvidence[0].roadmap_revision !== flow?.revision ? (
                          <p className="mt-2 italic">Saved from an earlier roadmap version; submit updated evidence against the current criteria to request an assessment.</p>
                        ) : (
                          <Button
                            type="button"
                            variant="link"
                            className="mt-1 h-auto p-0 text-xs text-atlas-accent"
                            disabled={busy}
                            onClick={() => onAssessEvidence(priorEvidence[0].id)}
                          >
                            Ask Atlas to assess this evidence
                          </Button>
                        );
                      })()}
                    </div>
                  )}
                  <textarea
                    className="mt-2 min-h-16 w-full resize-y rounded-md border border-atlas-border bg-atlas-background px-2 py-1.5 text-xs text-atlas-foreground outline-none focus:ring-1 focus:ring-atlas-accent"
                    maxLength={4000}
                    value={draft}
                    onChange={(event) => setEvidenceDrafts((previous) => ({ ...previous, [lesson.id]: event.target.value }))}
                    placeholder="Describe or link the work you completed. Submission is evidence, not a mastery score."
                    aria-label={`Evidence for ${lesson.title}`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full border-atlas-border bg-transparent text-atlas-foreground"
                    disabled={busy || draft.trim().length < 1}
                    onClick={() => onSubmitEvidence(lesson.id, draft.trim())}
                  >
                    <Send className="mr-2 h-3.5 w-3.5" /> Submit evidence
                  </Button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!roadmap && !proposal && (
        <p className="text-[11px] leading-5 text-atlas-muted">
          Your saved path and progress remain available while you explore. A roadmap is optional, and it can be revised if your direction changes.
        </p>
      )}
    </div>
  );
}

function ObjectiveList({
  roadmap,
  assessedLessonIds,
}: {
  roadmap: NonNullable<AtlasStudyFlowRecord["active_roadmap"]>;
  assessedLessonIds?: ReadonlySet<string>;
}) {
  return (
    <div className="space-y-2">
      {roadmap.objectives.map((objective) => (
        <details key={objective.id} className="rounded-lg border border-atlas-border p-2">
          <summary className="cursor-pointer text-xs font-semibold text-atlas-foreground">{objective.title}</summary>
          <p className="mt-2 text-xs leading-5 text-atlas-muted">{objective.description}</p>
          {objective.stages.map((stage) => (
            <div key={stage.id} className="mt-2 border-l border-atlas-border pl-2">
              <p className="text-xs font-medium text-atlas-foreground">{stage.title}</p>
              <p className="text-[11px] text-atlas-muted">{stage.purpose}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-atlas-accent"><CheckCircle2 className="h-3 w-3" /> Milestone: {stage.milestone.title}</p>
              {assessedLessonIds && (
                <p className="mt-1 text-[11px] text-atlas-muted">
                  Stage evidence: {stage.lessons.filter((lesson) => assessedLessonIds.has(lesson.id)).length}/{stage.lessons.length} lesson criteria met · milestone: {stage.milestone.criteria}
                </p>
              )}
              <ul className="mt-1 list-inside list-disc text-[11px] text-atlas-muted">
                {stage.lessons.map((lesson) => <li key={lesson.id}>{lesson.title}</li>)}
              </ul>
            </div>
          ))}
        </details>
      ))}
    </div>
  );
}
