import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Monitor, Briefcase, BarChart3, ArrowRight, ArrowLeft, Clock, BookOpen } from "lucide-react";
import { paths } from "@/data/paths";
import { useProgress } from "@/hooks/useProgress";
import { useState } from "react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Monitor, Briefcase, BarChart3,
};

export default function PathSelection() {
  const navigate = useNavigate();
  const { selectPath, getPathProgress } = useProgress();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelect = (pathId: string) => {
    selectPath(pathId);
    navigate(`/dashboard/${pathId}`);
  };

  return (
    <motion.div
      className="min-h-screen bg-background px-4 py-12 flex flex-col items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="max-w-4xl w-full">
        <motion.button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>

        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
            Choose Your Path
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Select a direction that matches your goals.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {paths.map((path, i) => {
            const Icon = iconMap[path.icon];
            const totalSessions = path.stages.reduce((a, s) => a + s.sessions.length, 0);
            const allIds = path.stages.flatMap(s => s.sessions.map(ss => ss.id));
            const progress = getPathProgress(path.id, allIds);
            const isHovered = hoveredId === path.id;

            return (
              <motion.button
                key={path.id}
                onClick={() => handleSelect(path.id)}
                onMouseEnter={() => setHoveredId(path.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group relative text-left p-7 rounded-2xl border border-border bg-card overflow-hidden transition-colors duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 + 0.15, duration: 0.4 }}
                whileHover={{ y: -4, boxShadow: `0 16px 32px -8px ${path.color}18` }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Glow */}
                <motion.div
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${path.color}12, transparent 70%)`,
                  }}
                  animate={{ opacity: isHovered ? 1 : 0 }}
                />

                <div className="relative z-10">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `color-mix(in srgb, ${path.color} 15%, transparent)`, color: path.color }}
                  >
                    {Icon && <Icon className="w-6 h-6" />}
                  </div>

                  <h3 className="text-xl font-bold mb-2">{path.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{path.description}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-5">
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{totalSessions} sessions</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{path.stages.length} stages</span>
                  </div>

                  {progress.completed > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{progress.percent}% complete</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: path.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress.percent}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  )}

                  <div
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: path.color }}
                  >
                    {progress.completed > 0 ? "Continue" : "Start Path"}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
