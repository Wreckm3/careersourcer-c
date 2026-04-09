import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Compass, BookOpen, BarChart3, Target, Zap, User } from "lucide-react";
import { useProgress } from "@/hooks/useProgress";
import { useState, useEffect } from "react";

const rotatingPhrases = [
  "Build Your Direction.",
  "Build Your Future.",
  "Shape Your Career.",
  "Find Your Path.",
  "Easy Way to Grow.",
];

function useRotatingText(phrases: string[], interval = 3000) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % phrases.length), interval);
    return () => clearInterval(timer);
  }, [phrases.length, interval]);
  return phrases[index];
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

const sectionFade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" as const },
  transition: { delay, duration: 0.5 },
});

const steps = [
  { icon: Compass, title: "Choose a Path", desc: "Technology, Business, or Data" },
  { icon: BookOpen, title: "Follow Sessions", desc: "Structured, step-by-step learning" },
  { icon: BarChart3, title: "Build Progress", desc: "Track growth and stay consistent" },
];

const values = [
  { icon: Target, text: "Clear direction for beginners" },
  { icon: BookOpen, text: "Structured learning paths" },
  { icon: Zap, text: "No distractions" },
  { icon: BarChart3, text: "Built for real progress" },
];

export default function Landing() {
  const navigate = useNavigate();
  const { progress } = useProgress();
  const hasProgress = progress.selectedPath && progress.completedSessions.length > 0;
  const headline = useRotatingText(rotatingPhrases, 3000);

  return (
    <div className="min-h-screen bg-background">
      {/* Profile icon */}
      <motion.button
        onClick={() => navigate("/profile")}
        className="fixed top-5 right-16 z-50 w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <User className="w-4 h-4" />
      </motion.button>

      {/* ─── HERO ─── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-accent-blue/5 blur-[120px]" />
        </div>

        <motion.div className="relative z-10 max-w-xl flex flex-col items-center gap-6" {...fadeUp(0)}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-foreground h-[1.2em] relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={headline}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="block"
              >
                {headline}
              </motion.span>
            </AnimatePresence>
          </h1>

          <motion.p {...fadeUp(0.3)} className="text-muted-foreground text-base sm:text-lg max-w-md">
            You don't need to have everything figured out. Start somewhere.
          </motion.p>

          <motion.div {...fadeUp(0.5)} className="flex flex-col sm:flex-row gap-3 mt-2">
            {hasProgress ? (
              <motion.button
                onClick={() => navigate(`/dashboard/${progress.selectedPath}`)}
                className="group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-accent-blue text-primary-foreground font-semibold text-base"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Continue Your Path
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </motion.button>
            ) : (
              <motion.button
                onClick={() => navigate("/paths")}
                className="group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-accent-blue text-primary-foreground font-semibold text-base"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Start Your Path
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </motion.button>
            )}
            <motion.button
              onClick={() => navigate("/paths")}
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl border border-border text-foreground font-semibold text-base hover:bg-muted transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              Explore Paths
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-2xl sm:text-3xl font-black tracking-tight text-center mb-14"
            {...sectionFade()}
          >
            How It Works
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                className="group flex flex-col items-center text-center p-6 rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                {...sectionFade(i * 0.1)}
              >
                <div className="w-14 h-14 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                  <s.icon className="w-6 h-6 text-accent-blue" />
                </div>
                <span className="text-xs font-bold text-accent-blue tracking-widest uppercase mb-2">
                  Step {i + 1}
                </span>
                <h3 className="text-lg font-bold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY ─── */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            className="text-2xl sm:text-3xl font-black tracking-tight text-center mb-12"
            {...sectionFade()}
          >
            Why Career Sourcer?
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {values.map((v, i) => (
              <motion.div
                key={v.text}
                className="flex items-center gap-3 px-5 py-4 rounded-xl border border-border bg-card transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                {...sectionFade(i * 0.08)}
              >
                <div className="w-9 h-9 rounded-lg bg-accent-emerald/10 flex items-center justify-center shrink-0">
                  <v.icon className="w-4 h-4 text-accent-emerald" />
                </div>
                <span className="text-sm font-medium">{v.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-28 px-6 border-t border-border">
        <motion.div
          className="max-w-xl mx-auto text-center flex flex-col items-center gap-5"
          {...sectionFade()}
        >
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            You don't need to have everything figured out.
          </h2>
          <p className="text-muted-foreground text-base">Just start somewhere.</p>
          <motion.button
            onClick={() => navigate("/paths")}
            className="group inline-flex items-center gap-2.5 px-10 py-4 rounded-xl bg-accent-blue text-primary-foreground font-semibold text-base mt-2"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Start Your Path
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
}
