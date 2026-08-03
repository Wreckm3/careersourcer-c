import { motion } from "framer-motion";
import { Rocket, Flame, Trophy, Layers, Star, Crown, Lock } from "lucide-react";
import { computeAchievements, type Achievement } from "@/lib/achievements";

const ICONS = { Rocket, Flame, Trophy, Layers, Star, Crown } as const;

export function Achievements({
  completedSessions,
  streakCurrent,
  streakDays,
}: {
  completedSessions: string[];
  streakCurrent: number;
  streakDays: string[];
}) {
  const badges = computeAchievements({ completedSessions, streakCurrent, streakDays });
  const earned = badges.filter((b) => b.earned).length;

  return (
    <section aria-label="Achievements">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Achievements</h2>
        <span className="text-xs text-muted-foreground">
          {earned}/{badges.length} earned
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {badges.map((b, i) => (
          <Badge key={b.id} badge={b} index={i} />
        ))}
      </div>
    </section>
  );
}

function Badge({ badge, index }: { badge: Achievement; index: number }) {
  const Icon = ICONS[badge.icon];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: badge.earned ? 0.96 : 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`p-4 rounded-2xl border flex flex-col gap-2 card-interactive ${
        badge.earned ? "border-primary/40 bg-primary/5 gold-glow" : "border-border bg-card"
      }`}
      title={badge.description}
    >
      <div className="flex items-center gap-2">
        <motion.div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            badge.earned ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
          initial={badge.earned ? { scale: 0.7, rotate: -8 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: index * 0.05 + 0.1, type: "spring", stiffness: 320, damping: 18 }}
        >
          {badge.earned ? <Icon className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
        </motion.div>
        <p className="text-sm font-bold text-foreground leading-tight">{badge.name}</p>
      </div>

      <p className="text-[11px] text-muted-foreground">{badge.description}</p>
      {!badge.earned && (
        <>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary/60"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(badge.progress * 100)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{badge.hint}</span>
        </>
      )}
    </motion.div>
  );
}
