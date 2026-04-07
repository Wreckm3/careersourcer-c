import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  BookOpen,
  BarChart3,
  Monitor,
  Briefcase,
  Database,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { PageTransition } from "@/components/career/PageTransition";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const paths = [
  {
    icon: Monitor,
    title: "Technology",
    desc: "Learn coding, tools, and modern tech skills.",
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
  },
  {
    icon: Briefcase,
    title: "Business",
    desc: "Understand strategy, leadership, and growth.",
    color: "text-accent-emerald",
    bg: "bg-accent-emerald/10",
  },
  {
    icon: Database,
    title: "Data",
    desc: "Master data analysis and decision-making.",
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
  },
];

const steps = [
  { icon: Compass, title: "Choose a Path", desc: "Technology, Business, or Data" },
  { icon: BookOpen, title: "Follow Structured Sessions", desc: "Simple, step-by-step learning" },
  { icon: BarChart3, title: "Build Real Progress", desc: "Track your growth and stay consistent" },
];

const values = [
  "Clear direction for beginners",
  "Structured learning paths",
  "No distractions",
  "Built for real progress",
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background overflow-x-hidden">
        {/* ─── HERO ─── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
          {/* Subtle gradient backdrop */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent-blue/5 blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-accent-purple/5 blur-[100px]" />
          </div>

          <motion.div
            className="relative z-10 max-w-2xl flex flex-col items-center gap-6"
            initial="hidden"
            animate="visible"
          >
            <motion.div custom={0} variants={fadeUp}>
              <Sparkles className="w-8 h-8 text-accent-blue mb-2 mx-auto" />
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-foreground"
            >
              Build Your Direction.
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              className="text-muted-foreground text-base sm:text-lg max-w-md"
            >
              You don't need to have everything figured out. Start somewhere.
            </motion.p>

            <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mt-2">
              <motion.button
                onClick={() => navigate("/paths")}
                className="group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-accent-blue text-primary-foreground font-semibold text-base transition-shadow duration-200 hover:shadow-lg hover:shadow-accent-blue/20"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Start Your Path
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </motion.button>

              <motion.button
                onClick={() => document.getElementById("paths-section")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl border border-border text-foreground font-semibold text-base transition-colors duration-200 hover:bg-muted"
                whileTap={{ scale: 0.97 }}
              >
                Explore Paths
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 flex flex-col items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <span className="text-[11px] text-muted-foreground tracking-widest uppercase">Scroll</span>
            <motion.div
              className="w-5 h-8 rounded-full border-2 border-border flex items-start justify-center p-1"
              animate={{}}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
                animate={{ y: [0, 12, 0] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="py-24 px-6 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-center mb-14"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
            >
              How It Works
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((s, i) => (
                <motion.div
                  key={s.title}
                  className="group flex flex-col items-center text-center p-6 rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.12, duration: 0.45 }}
                >
                  <div className="w-14 h-14 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                    <s.icon className="w-6 h-6 text-accent-blue" />
                  </div>
                  <span className="text-[11px] font-bold text-accent-blue tracking-widest uppercase mb-2">
                    Step {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-bold mb-1 text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CHOOSE YOUR PATH ─── */}
        <section id="paths-section" className="py-24 px-6 bg-card/50 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-center mb-14"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
            >
              Choose Your Path
            </motion.h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {paths.map((p, i) => (
                <motion.div
                  key={p.title}
                  className="group flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 cursor-pointer"
                  onClick={() => navigate("/paths")}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.12, duration: 0.45 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className={`w-14 h-14 rounded-xl ${p.bg} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}>
                    <p.icon className={`w-6 h-6 ${p.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{p.desc}</p>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${p.color} transition-transform group-hover:translate-x-0.5`}>
                    Start Path <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── WHY CAREER COMPASS ─── */}
        <section className="py-24 px-6 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-center mb-12"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
            >
              Why Career Compass?
            </motion.h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
              {values.map((v, i) => (
                <motion.div
                  key={v}
                  className="flex items-center gap-3 px-5 py-4 rounded-xl border border-border bg-card"
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-accent-emerald shrink-0" />
                  <span className="text-sm font-medium text-foreground">{v}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="py-28 px-6 border-t border-border bg-card/50">
          <motion.div
            className="max-w-xl mx-auto text-center flex flex-col items-center gap-5"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground leading-tight">
              You don't need to have everything figured out.
            </h2>
            <p className="text-muted-foreground text-base">Just start somewhere.</p>
            <motion.button
              onClick={() => navigate("/paths")}
              className="group inline-flex items-center gap-2.5 px-10 py-4 rounded-xl bg-accent-blue text-primary-foreground font-semibold text-base transition-shadow duration-200 hover:shadow-lg hover:shadow-accent-blue/20 mt-2"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Start Your Path
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          </motion.div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="py-8 px-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Career Compass. Built for focused growth.
          </p>
        </footer>
      </div>
    </PageTransition>
  );
}
