import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Flame, CheckCircle2, BarChart3, Monitor, Briefcase, LogOut, Mail, Pencil, Check } from "lucide-react";
import { useProgress } from "@/hooks/useProgress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { paths } from "@/data/paths";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const pathIcons: Record<string, React.ElementType> = {
  technology: Monitor,
  business: Briefcase,
  data: BarChart3,
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5 },
});

export default function Profile() {
  const navigate = useNavigate();
  const { progress, getPathProgress } = useProgress();
  const { user, loading: authLoading, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const name = data?.display_name || user.email?.split("@")[0] || "";
        setDisplayName(name);
        setDraft(name);
      });
  }, [user]);

  const saveName = async () => {
    if (!user || !draft.trim()) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: draft.trim() })
      .eq("id", user.id);
    if (error) {
      toast.error("Couldn't save");
      return;
    }
    setDisplayName(draft.trim());
    setEditing(false);
    toast.success("Saved");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const totalSessions = paths.reduce((sum, p) => sum + p.stages.reduce((s, st) => s + st.sessions.length, 0), 0);
  const completedCount = progress.completedSessions.length;
  const overallPercent = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;
  const streakCurrent = progress.streakCurrent;

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm font-medium"
          whileTap={{ scale: 0.95 }}
          {...fadeUp(0)}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>

        {/* Header */}
        <motion.h1
          className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-2"
          {...fadeUp(0.05)}
        >
          Your Profile
        </motion.h1>
        <motion.p className="text-muted-foreground mb-10" {...fadeUp(0.1)}>
          Track your overall growth across all paths.
        </motion.p>

        {/* Stats Grid */}
        <motion.div className="grid grid-cols-3 gap-4 mb-10" {...fadeUp(0.15)}>
          {[
            { icon: CheckCircle2, label: "Completed", value: completedCount, color: "text-accent-emerald" },
            { icon: Trophy, label: "Progress", value: `${overallPercent}%`, color: "text-accent-blue" },
            { icon: Flame, label: "Streak", value: `${streak.current}d`, color: "text-accent-purple" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-border bg-card"
            >
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
              <span className="text-2xl font-black text-foreground">{stat.value}</span>
              <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Overall Progress Bar */}
        <motion.div className="mb-10" {...fadeUp(0.2)}>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold text-foreground">Overall Progress</span>
            <span className="text-muted-foreground">{completedCount}/{totalSessions} sessions</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-accent-blue"
              initial={{ width: 0 }}
              animate={{ width: `${overallPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Per-path breakdown */}
        <motion.h2 className="text-lg font-bold text-foreground mb-4" {...fadeUp(0.25)}>
          Path Breakdown
        </motion.h2>

        <div className="flex flex-col gap-4">
          {paths.map((path, i) => {
            const allIds = path.stages.flatMap((s) => s.sessions.map((ss) => ss.id));
            const { completed, total, percent } = getPathProgress(path.id, allIds);
            const Icon = pathIcons[path.id] || BarChart3;

            return (
              <motion.div
                key={path.id}
                className="p-5 rounded-2xl border border-border bg-card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/dashboard/${path.id}`)}
                {...fadeUp(0.3 + i * 0.08)}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${path.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: path.color }} />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-foreground">{path.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">{completed}/{total}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: path.color }}>{percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: path.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
