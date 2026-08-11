import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, ArrowRight, Clock, Sparkles, Play, Target, Check,
  Flag, Package, Wrench, Lightbulb, Gauge, Pause, Timer, Flame, Trophy,
  AlertTriangle, BookOpen, ExternalLink, Compass, Award, Rocket,
} from "lucide-react";
import { getLesson, getNextLesson, getLessonAccess } from "@/data/curriculum";
import { useProgress } from "@/hooks/useProgress";
import { useSubscription } from "@/hooks/useSubscription";
import { useSessionTimer, formatClock } from "@/hooks/useSessionTimer";
import { VideoEmbed } from "@/components/career/VideoEmbed";
import { PremiumGate } from "@/components/PremiumGate";
import { EagleActivation } from "@/components/career/EagleActivation";
import { isEnabled } from "@/config/features";
import { focusMessage, completionMessage } from "@/lib/motivation";
import { buildAtlasLessonContext, emitAtlasMission } from "@/lib/atlas/lessonContext";
import { AtlasChat } from "@/components/career/AtlasChat";
import { ErrorBoundary } from "@/components/career/ErrorBoundary";
import { savePortfolioRecord } from "@/lib/portfolio";


type Step = "mission" | "video" | "build" | "confirm";
type Phase = "eagle" | "countdown" | "session";

const stepOrder: Step[] = ["mission", "video", "build", "confirm"];
const stepLabels: Record<Step, string> = {
  mission: "Mission",
  video: "Watch",
  build: "Build",
  confirm: "Complete",
};
const stepIcons: Record<Step, React.ComponentType<{ className?: string }>> = {
  mission: Flag,
  video: Play,
  build: Target,
  confirm: Check,
};

function StepIndicator({ current, color }: { current: Step; color: string }) {
  const currentIdx = stepOrder.indexOf(current);
  return (
    <div className="flex items-center gap-2">
      {stepOrder.map((s, i) => {
        const Icon = stepIcons[s];
        const active = i === currentIdx;
        const done = i < currentIdx;
        return (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                active ? "text-primary-foreground" : done ? "text-foreground" : "text-muted-foreground"
              }`}
              style={active ? { backgroundColor: color } : done ? { backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` } : undefined}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{stepLabels[s]}</span>
            </div>
            {i < stepOrder.length - 1 && <div className="w-3 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function BuilderTip({ tip, color }: { tip: string; color: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/30">
      <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color }}>
          Builder tip
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">{tip}</p>
      </div>
    </div>
  );
}

function Chips({ items, color }: { items: string[]; color: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span
          key={s}
          className="px-2.5 py-1 rounded-full text-[11px] font-medium border break-words"
          style={{
            borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
            color,
            backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

function InfoPanel({
  icon: Icon, label, color, children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-muted/30">
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color }}>
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      {children}
    </div>
  );
}

/** 3 · 2 · 1 lead-in so the session starts deliberately, not accidentally. */
function Countdown({ color, onDone }: { color: string; onDone: () => void }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) {
      const t = setTimeout(onDone, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((v) => v - 1), 650);
    return () => clearTimeout(t);
  }, [n, onDone]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background gap-4">
      <AnimatePresence mode="wait">
        <motion.span
          key={n}
          className="text-7xl font-bold tabular-nums"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {n === 0 ? "Go" : n}
        </motion.span>
      </AnimatePresence>
      <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
        Locking in
      </p>
      <button onClick={onDone} className="text-xs text-muted-foreground underline underline-offset-4">
        Skip
      </button>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; value: string; color: string;
}) {
  return (
    <div className="flex-1 min-w-[110px] p-3.5 rounded-xl border border-border bg-muted/30 text-center">
      <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color }} />
      <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function FocusMode() {
  const { pathId: branchId, sessionId: lessonId } = useParams<{ pathId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { completeSession, isCompleted, progress } = useProgress();
  const { tier } = useSubscription();
  const [step, setStep] = useState<Step>("mission");
  const [taskChecked, setTaskChecked] = useState(false);
  const [reflection, setReflection] = useState("");
  const [justCompleted, setJustCompleted] = useState(false);
  const [phase, setPhase] = useState<Phase>(isEnabled("focusModeEagle") ? "eagle" : "countdown");
  const [finalTime, setFinalTime] = useState(0);

  const timer = useSessionTimer(false);
  const { start: startTimer, pause: pauseTimer, resume: resumeTimer, reset: resetTimer } = timer;

  const data = getLesson(branchId || "", lessonId || "");
  const lesson = data?.lesson;
  const lessonAccess = data
    ? getLessonAccess(data.branch.id, data.lesson.id, progress.completedSessions, tier)
    : { allowed: false, reason: "missing" as const, prerequisiteLessonId: null };
  const nextLesson = data ? getNextLesson(data.branch.id, data.lesson.id) : null;

  // Start the clock once the lead-in finishes.
  useEffect(() => {
    if (phase === "session") startTimer();
  }, [phase, startTimer]);

  // Fresh clock + fresh lead-in whenever the mission changes.
  useEffect(() => {
    resetTimer();
    setPhase(isEnabled("focusModeEagle") ? "eagle" : "countdown");
  }, [lessonId, resetTimer]);

  const atlas = useMemo(() => {
    if (!data) return null;
    return buildAtlasLessonContext({
      category: data.category,
      branch: data.branch,
      lesson: data.lesson,
      lessonIndex: data.lessonIndex,
      totalLessons: data.totalLessons,
      nextLesson,
      isCompleted,
      streakCurrent: progress.streakCurrent,
    });
  }, [data, nextLesson, isCompleted, progress.streakCurrent]);

  const emitted = useRef<string | null>(null);
  useEffect(() => {
    if (justCompleted && atlas && emitted.current !== atlas.lessonId) {
      emitted.current = atlas.lessonId;
      emitAtlasMission({ ...atlas, missionCompleted: true, projectCompleted: lesson?.outcome ?? null });
    }
  }, [justCompleted, atlas, lesson]);

  if (!data || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Mission not found.</p>
      </div>
    );
  }

  const { category, branch, lessonIndex, totalLessons } = data;
  const done = isCompleted(lesson.id) || justCompleted;
  const isFinalMission = lessonIndex === totalLessons;

  const goNextStep = () => {
    const idx = stepOrder.indexOf(step);
    if (idx < stepOrder.length - 1) setStep(stepOrder[idx + 1]);
  };

  const handleComplete = () => {
    if (!lessonAccess.allowed) return;
    setFinalTime(timer.elapsed);
    pauseTimer();
    completeSession(lesson.id);
    // Portfolio-ready record: name, skills, date, notes (screenshot slot reserved).
    savePortfolioRecord({
      lessonId: lesson.id,
      branchId: branch.id,
      projectName: lesson.outcome,
      skills: lesson.skills ?? lesson.tools,
      completedAt: new Date().toISOString(),
      notes: reflection.trim() || undefined,
      screenshotUrl: null,
    });
    setJustCompleted(true);
  };

  const handleNext = () => {
    if (nextLesson) {
      setStep("mission");
      setTaskChecked(false);
      setReflection("");
      setJustCompleted(false);
      navigate(`/session/${branch.id}/${nextLesson.id}`, { replace: true });
    } else {
      navigate(`/branch/${category.id}/${branch.id}`);
    }
  };

  const missionBody = (
    <motion.div
      className="w-full max-w-2xl space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      key={lesson.id}
    >
      <div className="text-center space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: category.color }}>
          Mission {lessonIndex} of {totalLessons}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{lesson.title}</h1>
        <p className="text-muted-foreground text-sm">{lesson.mission}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground pt-1">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {lesson.duration}
          </span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5" /> {lesson.difficulty}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: MISSION BRIEF ── */}
        {step === "mission" && (
          <motion.div
            key="mission"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <p className="text-base leading-relaxed">{lesson.intro}</p>

              {lesson.whyItMatters && (
                <InfoPanel icon={Compass} label="Why this matters" color={category.color}>
                  <p className="text-sm leading-relaxed text-muted-foreground">{lesson.whyItMatters}</p>
                </InfoPanel>
              )}

              {branch.projectArc && (
                <p className="text-xs text-muted-foreground">
                  Part of <span className="font-semibold text-foreground">{branch.projectArc.projectName}</span> — {branch.projectArc.promise}
                </p>
              )}

              {lesson.skills?.length ? (
                <InfoPanel icon={Award} label="Skills you'll gain" color={category.color}>
                  <Chips items={lesson.skills} color={category.color} />
                </InfoPanel>
              ) : null}

              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: category.color }}>
                    <Package className="w-3.5 h-3.5" /> You'll end up with
                  </p>
                  <p className="text-sm leading-relaxed">{lesson.outcome}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: category.color }}>
                    <Wrench className="w-3.5 h-3.5" /> Tools you need
                  </p>
                  <ul className="text-sm leading-relaxed space-y-0.5">
                    {lesson.tools.map((t) => (
                      <li key={t} className="text-muted-foreground">• {t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <BuilderTip tip={lesson.builderTip} color={category.color} />

            <div className="flex justify-center">
              <button
                onClick={goNextStep}
                className="flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: category.color }}
              >
                Start mission <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: WATCH ── */}
        {step === "video" && (
          <motion.div
            key="video"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-5"
          >
            <p className="text-center text-sm text-muted-foreground">
              Build along with the video — pause whenever you need to catch up.
            </p>
            <VideoEmbed url={lesson.videoUrl} title={lesson.title} onSkip={goNextStep} />
            <div className="flex justify-center">
              <button
                onClick={goNextStep}
                className="flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: category.color }}
              >
                Show me what to build <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: BUILD ── */}
        {step === "build" && (
          <motion.div
            key="build"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div className="p-6 rounded-2xl border-2 bg-card" style={{ borderColor: `color-mix(in srgb, ${category.color} 35%, transparent)` }}>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4" style={{ color: category.color }} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: category.color }}>
                  Your build challenge
                </p>
              </div>
              <p className="text-base leading-relaxed font-medium">{lesson.challenge}</p>
              <p className="text-xs text-muted-foreground mt-4">
                Done right, you should now have: {lesson.outcome.toLowerCase()}
              </p>
            </div>
            <BuilderTip tip={lesson.builderTip} color={category.color} />

            {lesson.builderTips?.length ? (
              <InfoPanel icon={Lightbulb} label="More shortcuts" color={category.color}>
                <ul className="space-y-1.5">
                  {lesson.builderTips.map((t) => (
                    <li key={t} className="text-sm leading-relaxed text-muted-foreground">• {t}</li>
                  ))}
                </ul>
              </InfoPanel>
            ) : null}

            {lesson.mistakes?.length ? (
              <InfoPanel icon={AlertTriangle} label="Common beginner mistakes" color={category.color}>
                <ul className="space-y-1.5">
                  {lesson.mistakes.map((m) => (
                    <li key={m} className="text-sm leading-relaxed text-muted-foreground">• {m}</li>
                  ))}
                </ul>
              </InfoPanel>
            ) : null}

            {lesson.resources?.length ? (
              <InfoPanel icon={BookOpen} label="Useful resources" color={category.color}>
                <ul className="space-y-1.5">
                  {lesson.resources.map((r) => (
                    <li key={r.url}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm inline-flex items-center gap-1.5 underline underline-offset-4 hover:opacity-80 break-all"
                        style={{ color: category.color }}
                      >
                        {r.label} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </InfoPanel>
            ) : null}

            <p className="text-center text-xs text-muted-foreground italic">
              {focusMessage(lesson.id)}
            </p>
            <div className="flex justify-center">
              <button
                onClick={goNextStep}
                className="flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: category.color }}
              >
                I built it <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: COMPLETE ── */}
        {step === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-5"
          >
            {!done ? (
              <>
                <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
                  <p className="text-sm font-semibold">Confirm your build:</p>
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={taskChecked}
                      onChange={(e) => setTaskChecked(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded accent-current"
                      style={{ accentColor: category.color }}
                    />
                    <span className="text-sm leading-relaxed">
                      I actually built it — I have {lesson.outcome.toLowerCase()}.
                    </span>
                  </label>

                  <div className="space-y-2">
                    <label htmlFor="reflection" className="text-sm font-semibold block">
                      {lesson.reflection ?? "What did you accomplish in this mission?"}
                    </label>
                    <textarea
                      id="reflection"
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      rows={3}
                      maxLength={600}
                      placeholder="Optional — one or two lines. This becomes the note on your portfolio project."
                      className="w-full resize-none px-3 py-2 rounded-xl border border-border bg-input-background text-sm focus:outline-none focus:ring-2"
                      style={{ ["--tw-ring-color" as string]: `color-mix(in srgb, ${category.color} 45%, transparent)` }}
                    />
                  </div>
                </div>
                <div className="flex justify-center">
                  <motion.button
                    onClick={handleComplete}
                    disabled={!taskChecked}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: category.color }}
                    whileHover={taskChecked ? { scale: 1.02 } : undefined}
                    whileTap={taskChecked ? { scale: 0.98 } : undefined}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Complete mission
                  </motion.button>
                </div>
              </>
            ) : (
              <motion.div
                className="flex flex-col items-center gap-5 text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, type: "spring" }}
              >
                <motion.div
                  className="flex items-center gap-2 font-semibold"
                  style={{ color: category.color }}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [0.8, 1.08, 1] }}
                  transition={{ duration: 0.4 }}
                >
                  <Sparkles className="w-5 h-5" />
                  {isFinalMission ? "Foundation complete" : `Mission ${lessonIndex} complete`}
                  <Sparkles className="w-5 h-5" />
                </motion.div>

                {/* ── Today's achievement — replaces a generic "continue" ── */}
                <div className="w-full text-left p-5 rounded-2xl border border-border bg-card space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: category.color }}>
                    <Award className="w-3.5 h-3.5" /> Today's achievement
                  </p>
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">You built:</span> {lesson.outcome}
                  </p>
                  {lesson.whyItMatters && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">Why it matters:</span> {lesson.whyItMatters}
                    </p>
                  )}
                  {lesson.skills?.length ? <Chips items={lesson.skills} color={category.color} /> : null}
                </div>

                {/* Session statistics */}
                <div className="w-full flex flex-wrap gap-3">
                  <StatTile
                    icon={Timer}
                    label="Focused time"
                    value={formatClock(finalTime || timer.elapsed)}
                    color={category.color}
                  />
                  <StatTile
                    icon={Flame}
                    label="Day streak"
                    value={String(progress.streakCurrent)}
                    color={category.color}
                  />
                  <StatTile
                    icon={Trophy}
                    label="Missions built"
                    value={String(progress.completedSessions.length)}
                    color={category.color}
                  />
                </div>

                {/* ── Next mission teaser, or foundation completion ── */}
                {nextLesson ? (
                  <div className="w-full text-left p-5 rounded-2xl border-2 bg-card space-y-2"
                    style={{ borderColor: `color-mix(in srgb, ${category.color} 35%, transparent)` }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: category.color }}>
                      <Rocket className="w-3.5 h-3.5" /> Next mission · {lessonIndex + 1} of {totalLessons}
                    </p>
                    <p className="text-base font-semibold">{nextLesson.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {lesson.nextTeaser ?? nextLesson.mission}
                    </p>
                  </div>
                ) : (
                  <div className="w-full text-left p-5 rounded-2xl border-2 bg-card space-y-3"
                    style={{ borderColor: `color-mix(in srgb, ${category.color} 45%, transparent)` }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: category.color }}>
                      <Trophy className="w-3.5 h-3.5" /> You built it
                    </p>
                    <p className="text-base font-semibold">
                      {branch.projectArc?.projectName ?? `${branch.title} foundation project`}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {branch.projectArc?.promise ??
                        `All ${totalLessons} missions in ${branch.title} are done — everything you built is yours to show off.`}
                    </p>
                    {branch.projectArc?.whatsNext?.length ? (
                      <div>
                        <p className="text-xs font-semibold mb-1.5">What you can build next</p>
                        <ul className="space-y-1">
                          {branch.projectArc.whatsNext.map((n) => (
                            <li key={n} className="text-sm text-muted-foreground leading-relaxed">• {n}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="pt-2 mt-1 border-t border-border space-y-2">
                      <p className="text-sm leading-relaxed">
                        You've completed the foundation. Ready to build bigger projects with your personal mentor?
                      </p>
                      <button
                        onClick={() => navigate("/pricing")}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-muted/50"
                        style={{ borderColor: category.color, color: category.color }}
                      >
                        <Sparkles className="w-4 h-4" /> Meet Atlas
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs italic text-muted-foreground">{completionMessage(lesson.id)}</p>

                <motion.button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-primary-foreground"
                  style={{ backgroundColor: category.color }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {nextLesson ? <>Start next mission <ArrowRight className="w-4 h-4" /></> : "Back to track"}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <motion.div
      className="min-h-screen bg-background flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {phase === "eagle" && (
        <EagleActivation
          color={category.color}
          label={`${branch.title} · Focus Mode`}
          onDone={() => setPhase("countdown")}
        />
      )}
      {phase === "countdown" && (
        <Countdown color={category.color} onDone={() => setPhase("session")} />
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
            {lessonIndex}/{totalLessons}
          </span>
          <StepIndicator current={step} color={category.color} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs tabular-nums text-muted-foreground font-medium hidden xs:inline sm:inline">
            {formatClock(timer.elapsed)}
          </span>
          <button
            onClick={() => (timer.running ? pauseTimer() : resumeTimer())}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label={timer.running ? "Pause session" : "Resume session"}
            disabled={phase !== "session"}
          >
            {timer.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate(`/branch/${category.id}/${branch.id}`)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Exit"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mission progress bar */}
      <div className="h-1 w-full bg-muted">
        <motion.div
          className="h-full"
          style={{ backgroundColor: category.color }}
          initial={{ width: 0 }}
          animate={{ width: `${((stepOrder.indexOf(step) + 1) / stepOrder.length) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {lessonAccess.reason === "tier" ? (
          <div className="w-full max-w-2xl">
            <PremiumGate required="builder" featureName={`Mission ${lessonIndex}: ${lesson.title}`}>
              {missionBody}
            </PremiumGate>
          </div>
        ) : lessonAccess.reason === "prerequisite" ? (
          <div className="w-full max-w-2xl surface-card p-6 space-y-3">
            <h2 className="text-lg font-bold">Finish the previous mission first</h2>
            <p className="text-sm text-muted-foreground">Atlas keeps this path sequential so each mission prepares you for the next one.</p>
            <button onClick={() => navigate(`/session/${branch.id}/${lessonAccess.prerequisiteLessonId}`)} className="btn-primary-gold rounded-lg px-4 py-2 text-sm">Continue the prerequisite</button>
          </div>
        ) : (
          missionBody
        )}
      </div>

      {/* Paused overlay — keeps focus honest without losing state */}
      <AnimatePresence>
        {phase === "session" && !timer.running && !done && timer.elapsed > 0 && (
          <motion.div
            className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Pause className="w-8 h-8" style={{ color: category.color }} />
            <p className="text-sm text-muted-foreground">Session paused · {formatClock(timer.elapsed)}</p>
            <button
              onClick={resumeTimer}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-primary-foreground"
              style={{ backgroundColor: category.color }}
            >
              <Play className="w-4 h-4" /> Resume
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "session" && (
        <ErrorBoundary label="AtlasChat" fallback={null}>
          <AtlasChat lessonContext={atlas} />
        </ErrorBoundary>
      )}
    </motion.div>
  );
}

