import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Circle, Play, Clock } from "lucide-react";
import { getBranch, getBranchProgress } from "@/data/curriculum";
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

export default function Branch() {
  const { categoryId, branchId } = useParams<{ categoryId: string; branchId: string }>();
  const navigate = useNavigate();
  const { progress, isCompleted } = useProgress();

  const data = getBranch(categoryId || "", branchId || "");
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Branch not found.</p>
      </div>
    );
  }

  const { category, branch } = data;
  const { completed, total, percent } = getBranchProgress(branch, progress.completedSessions);
  const firstIncomplete = branch.lessons.find((l) => !isCompleted(l.id));

  return (
    <motion.div
      className="min-h-screen bg-background px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(`/category/${category.id}`)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>{category.emoji}</span> {category.title}
            </p>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <span>{branch.emoji}</span> {branch.title}
            </h1>
          </div>
        </div>

        <motion.div
          className="mb-8 p-5 rounded-2xl border border-border bg-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <ProgressRing percent={percent} color={category.color} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-black">{percent}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">{branch.tagline}</p>
              <p className="text-xs text-muted-foreground mb-3">
                {completed} of {total} lessons completed
              </p>
              {firstIncomplete && (
                <Link
                  to={`/session/${branch.id}/${firstIncomplete.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: category.color }}
                >
                  <Play className="w-4 h-4" />
                  {completed > 0 ? "Continue" : "Start First Lesson"}
                </Link>
              )}
              {completed === total && total > 0 && (
                <p className="text-sm font-semibold" style={{ color: category.color }}>
                  ✓ Branch completed!
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Lessons
        </h2>
        <div className="space-y-2">
          {branch.lessons.map((lesson, i) => {
            const done = isCompleted(lesson.id);
            const isCurrent = firstIncomplete?.id === lesson.id;
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 + 0.15 }}
              >
                <Link
                  to={`/session/${branch.id}/${lesson.id}`}
                  className={`group flex items-center gap-3 p-3.5 rounded-xl border bg-card transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 ${
                    isCurrent ? "ring-1" : ""
                  } border-border`}
                  style={isCurrent ? { ["--tw-ring-color" as never]: category.color } : undefined}
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: category.color }} />
                  ) : (
                    <Circle className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${done ? "line-through opacity-50" : ""}`}>
                      {i + 1}. {lesson.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{lesson.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {lesson.duration}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
