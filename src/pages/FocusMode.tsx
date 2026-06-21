import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ArrowRight, Clock, Sparkles, BookOpen, Play, Target, Check } from "lucide-react";
import { getLesson, getNextLesson } from "@/data/curriculum";
import { useProgress } from "@/hooks/useProgress";
import { VideoEmbed } from "@/components/career/VideoEmbed";

type Step = "intro" | "video" | "challenge" | "confirm";

const stepOrder: Step[] = ["intro", "video", "challenge", "confirm"];
const stepLabels: Record<Step, string> = {
  intro: "Read",
  video: "Watch",
  challenge: "Build",
  confirm: "Confirm",
};
const stepIcons: Record<Step, React.ComponentType<{ className?: string }>> = {
  intro: BookOpen,
  video: Play,
  challenge: Target,
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
              style={active ? { backgroundColor: color } : done ? { backgroundColor: `${color}22` } : undefined}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{stepLabels[s]}</span>
            </div>
            {i < stepOrder.length - 1 && (
              <div className="w-3 h-px bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FocusMode() {
  const { pathId: branchId, sessionId: lessonId } = useParams<{ pathId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { completeSession, isCompleted } = useProgress();
  const [step, setStep] = useState<Step>("intro");
  const [taskChecked, setTaskChecked] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const data = getLesson(branchId || "", lessonId || "");
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Lesson not found.</p>
      </div>
    );
  }

  const { category, branch, lesson, lessonIndex, totalLessons } = data;
  const nextLesson = getNextLesson(branch.id, lesson.id);
  const done = isCompleted(lesson.id) || justCompleted;

  const goNextStep = () => {
    const idx = stepOrder.indexOf(step);
    if (idx < stepOrder.length - 1) setStep(stepOrder[idx + 1]);
  };

  const handleComplete = () => {
    completeSession(lesson.id);
    setJustCompleted(true);
  };

  const handleNext = () => {
    if (nextLesson) {
      setStep("intro");
      setTaskChecked(false);
      setJustCompleted(false);
      navigate(`/session/${branch.id}/${nextLesson.id}`, { replace: true });
    } else {
      navigate(`/branch/${category.id}/${branch.id}`);
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-background flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
            {lessonIndex}/{totalLessons}
          </span>
          <StepIndicator current={step} color={category.color} />
        </div>
        <button
          onClick={() => navigate(`/branch/${category.id}/${branch.id}`)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Exit"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          className="w-full max-w-2xl space-y-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          key={lesson.id}
        >
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{lesson.title}</h1>
            <p className="text-muted-foreground text-sm">{lesson.description}</p>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> {lesson.duration}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ── STEP 1: INTRO ── */}
            {step === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                <div className="p-6 rounded-2xl border border-border bg-card">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: category.color }}>
                    Quick intro · 2 min read
                  </p>
                  <p className="text-base leading-relaxed">{lesson.intro}</p>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={goNextStep}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-primary-foreground"
                    style={{ backgroundColor: category.color }}
                  >
                    Watch the video <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: VIDEO ── */}
            {step === "video" && (
              <motion.div
                key="video"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                <VideoEmbed url={lesson.videoUrl} title={lesson.title} onSkip={goNextStep} />
                <div className="flex justify-center">
                  <button
                    onClick={goNextStep}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-primary-foreground"
                    style={{ backgroundColor: category.color }}
                  >
                    Got it — show the challenge <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: CHALLENGE ── */}
            {step === "challenge" && (
              <motion.div
                key="challenge"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                <div
                  className="p-6 rounded-2xl border-2 bg-card"
                  style={{ borderColor: `${category.color}40` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4" style={{ color: category.color }} />
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: category.color }}>
                      Your action challenge
                    </p>
                  </div>
                  <p className="text-base leading-relaxed font-medium">{lesson.challenge}</p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Do this now. It only counts if you actually try it.
                  </p>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={goNextStep}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-primary-foreground"
                    style={{ backgroundColor: category.color }}
                  >
                    Done — let me confirm <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: CONFIRM ── */}
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
                      <p className="text-sm font-semibold">Confirm what you did:</p>
                      <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={taskChecked}
                          onChange={(e) => setTaskChecked(e.target.checked)}
                          className="mt-1 w-4 h-4 rounded accent-current"
                          style={{ accentColor: category.color }}
                        />
                        <span className="text-sm leading-relaxed">
                          I actually attempted the challenge — not just read it.
                        </span>
                      </label>
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
                        Mark lesson complete
                      </motion.button>
                    </div>
                  </>
                ) : (
                  <motion.div
                    className="flex flex-col items-center gap-4"
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
                      Today you actually learned something.
                      <Sparkles className="w-5 h-5" />
                    </motion.div>
                    <motion.button
                      onClick={handleNext}
                      className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-primary-foreground"
                      style={{ backgroundColor: category.color }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {nextLesson ? <>Next lesson <ArrowRight className="w-4 h-4" /></> : "Back to branch"}
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
