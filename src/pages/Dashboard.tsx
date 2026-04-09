import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Circle, Play, Lock, Clock } from "lucide-react";
import { getPath } from "@/data/paths";
import { useProgress } from "@/hooks/useProgress";

function ProgressRing({ percent, color, size = 72 }: { percent: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} className="stroke-muted" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" strokeWidth={5} strokeLinecap="round"
        stroke={color}
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeOut" }}
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

  // Determine which stages are unlocked: a stage is unlocked if all previous stages are complete
  const stageUnlocked = path.stages.map((stage, si) => {
    if (si === 0) return true;
    // Previous stage must be fully completed
    const prev = path.stages[si - 1];
    return prev.sessions.every((s) => isCompleted(s.id));
  });

  return (
    <motion.div
      className="min-h-screen bg-background px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/paths")}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Path</p>
            <h1 className="text-2xl font-black tracking-tight">{path.title}</h1>
          </div>
        </div>

        {/* Progress + Continue */}
        <motion.div
          className="mb-8 p-5 rounded-2xl border border-border bg-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <ProgressRing percent={percent} color={path.color} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-black">{percent}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                {completed} of {total} sessions completed
              </p>
              {completed > 0 && completed < total && (
                <p className="text-xs text-muted-foreground mb-3 italic">Continue your progress.</p>
              )}
              {firstIncomplete && (
                <Link
                  to={`/session/${path.id}/${firstIncomplete.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: path.color }}
                >
                  <Play className="w-4 h-4" />
                  {completed > 0 ? "Continue Session" : "Start First Session"}
                </Link>
              )}
              {completed === total && total > 0 && (
                <p className="text-sm font-semibold" style={{ color: path.color }}>
                  ✓ Path completed!
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stages */}
        <div className="space-y-6">
          {path.stages.map((stage, si) => {
            const unlocked = stageUnlocked[si];
            const stageCompleted = stage.sessions.filter((s) => isCompleted(s.id)).length;
            const stageTotal = stage.sessions.length;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.08 + 0.15 }}
              >
                {/* Stage header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {!unlocked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    <h2 className={`text-lg font-bold ${!unlocked ? "text-muted-foreground" : ""}`}>
                      {stage.title}
                    </h2>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {stageCompleted}/{stageTotal}
                  </span>
                </div>
                <p className={`text-sm mb-3 ${unlocked ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                  {stage.description}
                </p>

                {/* Sessions */}
                <div className="space-y-2">
                  {stage.sessions.map((session) => {
                    const done = isCompleted(session.id);
                    const isCurrent = firstIncomplete?.id === session.id;

                    return (
                      <motion.div key={session.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: si * 0.08 + 0.2 }}>
                        {unlocked ? (
                          <Link
                            to={`/session/${path.id}/${session.id}`}
                            className={`group flex items-center gap-3 p-3.5 rounded-xl border bg-card transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 ${
                              isCurrent ? "border-[color:var(--accent-blue)] ring-1 ring-[color:var(--accent-blue)]/20" : "border-border"
                            }`}
                          >
                            {done ? (
                              <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: path.color }} />
                            ) : (
                              <Circle className={`w-5 h-5 flex-shrink-0 ${isCurrent ? "text-accent-blue" : "text-muted-foreground"}`} />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-sm ${done ? "line-through opacity-50" : ""}`}>
                                {session.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{session.description}</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              {session.duration}
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card opacity-40">
                            <Lock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{session.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{session.description}</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
