import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ArrowRight, Clock, Sparkles } from "lucide-react";
import { getSession, getNextSession } from "@/data/paths";
import { useProgress } from "@/hooks/useProgress";
import { VideoEmbed } from "@/components/career/VideoEmbed";

function StepBar({ current, total, color }: { current: number; total: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${i < current ? "w-6" : "w-3"}`}
          style={{ backgroundColor: i < current ? color : undefined }}
        >
          {i >= current && <div className="w-full h-full bg-muted rounded-full" />}
        </div>
      ))}
    </div>
  );
}

export default function FocusMode() {
  const { pathId, sessionId } = useParams<{ pathId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { completeSession, isCompleted } = useProgress();
  const [justCompleted, setJustCompleted] = useState(false);

  const data = getSession(pathId || "", sessionId || "");
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Session not found.</p>
      </div>
    );
  }

  const { path, session, sessionIndex, totalSessions } = data;
  const nextSession = getNextSession(path.id, session.id);
  const done = isCompleted(session.id) || justCompleted;

  const handleComplete = () => {
    completeSession(session.id);
    setJustCompleted(true);
  };

  const handleNext = () => {
    if (nextSession) {
      setJustCompleted(false);
      navigate(`/session/${path.id}/${nextSession.id}`, { replace: true });
    } else {
      navigate(`/dashboard/${path.id}`);
    }
  };

  const handleSkip = () => {
    if (nextSession) {
      navigate(`/session/${path.id}/${nextSession.id}`, { replace: true });
    } else {
      navigate(`/dashboard/${path.id}`);
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-background flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top bar — minimal */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground font-medium">
            {sessionIndex} / {totalSessions}
          </span>
          <StepBar current={sessionIndex} total={totalSessions} color={path.color} />
        </div>
        <button
          onClick={() => navigate(`/dashboard/${path.id}`)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Exit"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          className="w-full max-w-3xl space-y-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          key={session.id}
        >
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{session.title}</h1>
            <p className="text-muted-foreground text-sm">{session.description}</p>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {session.duration}
            </div>
          </div>

          {/* Video */}
          <VideoEmbed url={session.videoUrl} title={session.title} onSkip={handleSkip} />

          {/* Task */}
          <div className="p-5 rounded-xl border border-border bg-card">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your Task</p>
            <p className="text-sm leading-relaxed">{session.task}</p>
          </div>

          {/* Actions */}
          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div
                key="complete"
                className="flex justify-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <motion.button
                  onClick={handleComplete}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Mark as Complete
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="done"
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, type: "spring" }}
              >
                <motion.div
                  className="flex items-center gap-2 text-accent-emerald font-semibold"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [0.8, 1.08, 1] }}
                  transition={{ duration: 0.4 }}
                >
                  <Sparkles className="w-5 h-5" />
                  Step completed.
                  <Sparkles className="w-5 h-5" />
                </motion.div>

                <motion.button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-primary-foreground"
                  style={{ backgroundColor: path.color }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {nextSession ? (
                    <>Continue <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    "Back to Dashboard"
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
