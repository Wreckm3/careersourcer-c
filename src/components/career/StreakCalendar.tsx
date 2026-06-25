import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface Props {
  streakDays: string[]; // ISO yyyy-mm-dd strings of days lessons were completed
  streakCurrent: number;
}

function getLast7Days(): { iso: string; label: string; dayNum: string }[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      iso: d.toISOString().slice(0, 10),
      label: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()],
      dayNum: String(d.getDate()),
    });
  }
  return days;
}

export function StreakCalendar({ streakDays, streakCurrent }: Props) {
  const week = getLast7Days();
  const todayIso = new Date().toISOString().slice(0, 10);
  const set = new Set(streakDays);

  return (
    <div className="p-5 rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.div
            animate={
              streakCurrent > 0
                ? { scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }
                : {}
            }
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.5 }}
            className="relative"
          >
            <Flame
              className={`w-6 h-6 ${
                streakCurrent > 0 ? "text-orange-500" : "text-muted-foreground"
              }`}
              fill={streakCurrent > 0 ? "currentColor" : "none"}
            />
            {streakCurrent > 0 && (
              <motion.span
                className="absolute inset-0 rounded-full bg-orange-500/30 blur-md -z-10"
                animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
            )}
          </motion.div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">
              {streakCurrent}-day streak
            </p>
            <p className="text-xs text-muted-foreground">
              Complete a lesson today to keep it alive
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {week.map((d, i) => {
          const active = set.has(d.iso);
          const isToday = d.iso === todayIso;
          return (
            <motion.div
              key={d.iso}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-[10px] font-medium text-muted-foreground">
                {d.label}
              </span>
              <motion.div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold border ${
                  active
                    ? "bg-gradient-to-br from-orange-400 to-red-500 text-white border-orange-500/50 shadow-sm shadow-orange-500/40"
                    : isToday
                    ? "border-dashed border-orange-400/60 text-muted-foreground"
                    : "border-border bg-muted/40 text-muted-foreground"
                }`}
                whileHover={{ scale: 1.08 }}
                animate={
                  active && isToday
                    ? { scale: [1, 1.12, 1] }
                    : {}
                }
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                {active ? (
                  <Flame className="w-4 h-4" fill="currentColor" />
                ) : (
                  d.dayNum
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
