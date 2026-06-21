import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Flame, CheckCircle2, LogOut, Mail, Pencil, Check, Monitor, Briefcase, Palette } from "lucide-react";
import { useProgress } from "@/hooks/useProgress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/data/curriculum";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const categoryIcons: Record<string, React.ElementType> = {
  technology: Monitor,
  business: Briefcase,
  creative: Palette,
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5 },
});

export default function Profile() {
  const navigate = useNavigate();
  const { progress } = useProgress();
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
    if (error) { toast.error("Couldn't save"); return; }
    setDisplayName(draft.trim());
    setEditing(false);
    toast.success("Saved");
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  // Aggregate across all featured lessons
  const allLessons = categories.flatMap((c) => c.branches.flatMap((b) => b.lessons));
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => progress.completedSessions.includes(l.id)).length;
  const overallPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const streakCurrent = progress.streakCurrent;

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm font-medium"
          whileTap={{ scale: 0.95 }}
          {...fadeUp(0)}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>

        <motion.div className="flex items-start justify-between gap-4 mb-2" {...fadeUp(0.05)}>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={60}
                  autoFocus
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-input-background text-2xl font-black focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
                />
                <button onClick={saveName} className="p-2 rounded-lg bg-accent-blue text-primary-foreground" aria-label="Save">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-2">
                {displayName || "Your Profile"}
                <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground" aria-label="Edit name">
                  <Pencil className="w-4 h-4" />
                </button>
              </h1>
            )}
            {user?.email && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                <Mail className="w-3.5 h-3.5" /> {user.email}
              </p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </motion.div>
        <motion.p className="text-muted-foreground mb-10" {...fadeUp(0.1)}>
          Track your overall growth across all branches.
        </motion.p>

        <motion.div className="grid grid-cols-3 gap-4 mb-10" {...fadeUp(0.15)}>
          {[
            { icon: CheckCircle2, label: "Completed", value: completedCount, color: "text-accent-emerald" },
            { icon: Trophy, label: "Progress", value: `${overallPercent}%`, color: "text-accent-blue" },
            { icon: Flame, label: "Streak", value: `${streakCurrent}d`, color: "text-accent-purple" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-border bg-card">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
              <span className="text-2xl font-black text-foreground">{stat.value}</span>
              <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
            </div>
          ))}
        </motion.div>

        <motion.div className="mb-10" {...fadeUp(0.2)}>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold text-foreground">Overall Progress</span>
            <span className="text-muted-foreground">{completedCount}/{totalLessons} lessons</span>
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

        <motion.h2 className="text-lg font-bold text-foreground mb-4" {...fadeUp(0.25)}>
          Category Breakdown
        </motion.h2>

        <div className="flex flex-col gap-4">
          {categories.map((cat, i) => {
            const catLessons = cat.branches.flatMap((b) => b.lessons);
            const done = catLessons.filter((l) => progress.completedSessions.includes(l.id)).length;
            const tot = catLessons.length;
            const pct = tot > 0 ? Math.round((done / tot) * 100) : 0;
            const Icon = categoryIcons[cat.id] || Trophy;

            return (
              <motion.div
                key={cat.id}
                className="p-5 rounded-2xl border border-border bg-card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/category/${cat.id}`)}
                {...fadeUp(0.3 + i * 0.08)}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}15` }}>
                    <Icon className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-foreground">{cat.emoji} {cat.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">{done}/{tot}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: cat.color }}>{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
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
