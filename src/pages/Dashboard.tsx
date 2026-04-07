import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Circle, Play, Flame, Clock } from "lucide-react";
import { getPath } from "@/data/paths";
import { useProgress } from "@/hooks/useProgress";
import { PageTransition } from "@/components/career/PageTransition";
import { useMemo } from "react";

const quotes = [
  "Small steps every day lead to big results.",
  "Consistency beats intensity.",
  "The best time to start was yesterday. The next best time is now.",
  "Progress, not perfection.",
];

function ProgressRing({ percent, color, size = 80 }: { percent: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className="stroke-muted" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" strokeWidth={6} strokeLinecap="round"
        stroke={color}
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function Dashboard() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const { isCompleted, getPathProgress } = useProgress();

  const path = getPath(pathId || "");
  if (!path) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Path not found.</p>
      </div>
    );
  }

  const allSessionIds = path.stages.flatMap((s) => s.sessions.map((ss) => ss.id));
  const { completed, total, percent } = getPathProgress(path.id, allSessionIds);
  const firstIncomplete = path.stages.flatMap((s) => s.sessions).find((s) => !isCompleted(s.id));
  const randomQuote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => navigate("/paths")}
              className="p-2 rounded-lg hover:bg-muted transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Your Development</p>
              <h1 className="text-3xl font-black tracking-tight">{path.title}</h1>
            </div>
          </div>

          {/* Progress Card */}
          <motion.div
            className="mb-8 p-6 rounded-2xl border border-border bg-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <ProgressRing percent={percent} color={path.color} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black">{percent}%</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">
                  {completed} of {total} sessions completed
                </p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: path.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
                {firstIncomplete && (
                  <Link
                    to={`/session/${path.id}/${firstIncomplete.id}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground transition-all duration-200 hover:scale-[1.03] hover:shadow-lg"
                    style={{ backgroundColor: path.color }}
                  >
                    <Play className="w-4 h-4" />
                    Continue Session
                  </Link>
                )}
              </div>
            </div>
          </motion.div>

          {/* Motivational Quote */}
          <motion.div
            className="mb-8 p-4 rounded-xl border border-border bg-card/50 flex items-start gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Flame className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground italic">"{randomQuote}"</p>
          </motion.div>

          {/* Stages */}
          <div className="space-y-8">
            {path.stages.map((stage, si) => {
              const stageCompleted = stage.sessions.filter(s => isCompleted(s.id)).length;
              const stageTotal = stage.sessions.length;
              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: si * 0.1 + 0.2 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-bold">{stage.title}</h2>
                    <span className="text-xs text-muted-foreground font-medium">{stageCompleted}/{stageTotal}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{stage.description}</p>
                  <div className="space-y-2">
                    {stage.sessions.map((session, sessionIdx) => {
                      const done = isCompleted(session.id);
                      return (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: si * 0.1 + sessionIdx * 0.05 + 0.3 }}
                        >
                          <Link
                            to={`/session/${path.id}/${session.id}`}
                            className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                          >
                            <motion.div whileHover={{ scale: 1.15 }} transition={{ type: "spring" }}>
                              {done ? (
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: path.color }} />
                              ) : (
                                <Circle className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                              )}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-sm ${done ? "line-through opacity-60" : ""}`}>
                                {session.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{session.description}</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              {session.duration}
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
