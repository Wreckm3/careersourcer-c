import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { getSession, getNextSession } from "@/data/paths";
import { useProgress } from "@/hooks/useProgress";
import { VideoEmbed } from "@/components/career/VideoEmbed";

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
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs text-muted-foreground font-medium">
          Session {sessionIndex} of {totalSessions}
        </span>
        <button
          onClick={() => navigate(`/dashboard/${path.id}`)}
          className="p-2 rounded-lg hover:bg-muted transition-colors duration-200"
          aria-label="Exit focus mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl space-y-6">
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-transform duration-200 hover:scale-[1.03]"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Mark as Complete
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="completed"
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2 text-accent-emerald font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  Step completed!
                </div>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-transform duration-200 hover:scale-[1.03] text-primary-foreground"
                  style={{ backgroundColor: path.color }}
                >
                  {nextSession ? (
                    <>
                      Next Session <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    "Back to Dashboard"
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
