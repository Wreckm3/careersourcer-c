import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
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
  Star,
  Target,
  Zap,
} from "lucide-react";
import { PageTransition } from "@/components/career/PageTransition";

/* ── Typing effect ── */
function useTypingEffect(text: string, speed = 50) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      setDisplayed(text.slice(0, ++i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return displayed;
}

/* ── Animated counter ── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let frame: number;
    const duration = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(ease * target));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [started, target]);

  return <span ref={ref}>{value}{suffix}</span>;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const paths = [
  { icon: Monitor, title: "Technology", desc: "Learn coding, tools, and modern tech skills.", color: "text-accent-blue", bg: "bg-accent-blue/10" },
  { icon: Briefcase, title: "Business", desc: "Understand strategy, leadership, and growth.", color: "text-accent-emerald", bg: "bg-accent-emerald/10" },
  { icon: Database, title: "Data", desc: "Master data analysis and decision-making.", color: "text-accent-purple", bg: "bg-accent-purple/10" },
];

const steps = [
  { icon: Compass, title: "Choose a Path", desc: "Technology, Business, or Data" },
  { icon: BookOpen, title: "Follow Structured Sessions", desc: "Simple, step-by-step learning" },
  { icon: BarChart3, title: "Build Real Progress", desc: "Track your growth and stay consistent" },
];

const values = [
  { icon: Target, text: "Clear direction for beginners" },
  { icon: BookOpen, text: "Structured learning paths" },
  { icon: Zap, text: "No distractions" },
  { icon: BarChart3, text: "Built for real progress" },
];

const testimonials = [
  { name: "Alex M.", role: "Career Switcher", text: "Career Compass gave me the clarity I needed to transition into tech.", rating: 5 },
  { name: "Sara K.", role: "Student", text: "The structured sessions kept me consistent. I finally stopped jumping between tutorials.", rating: 5 },
  { name: "James R.", role: "Freelancer", text: "Simple, focused, and effective. Exactly what I was looking for.", rating: 4 },
];

const stats = [
  { value: 27, suffix: "+", label: "Sessions" },
  { value: 3, suffix: "", label: "Learning Paths" },
  { value: 9, suffix: "", label: "Stages" },
];

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const headline = useTypingEffect("Build Your Direction.", 55);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.6], [0, -40]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background overflow-x-hidden">
        {/* ─── HERO ─── */}
        <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent-blue/5 blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-accent-purple/5 blur-[100px]" />
          </div>

          <motion.div
            className="relative z-10 max-w-2xl flex flex-col items-center gap-6"
            style={{ opacity: heroOpacity, y: heroY }}
          >
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
              <Sparkles className="w-8 h-8 text-accent-blue mb-2 mx-auto" />
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-foreground min-h-[1.2em]">
              {headline}
              <motion.span
                className="inline-block w-[3px] h-[0.85em] bg-accent-blue ml-1 align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.6 }}
              className="text-muted-foreground text-base sm:text-lg max-w-md"
            >
              You don't need to have everything figured out. Start somewhere.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 mt-2"
            >
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
            transition={{ delay: 2.8 }}
          >
            <span className="text-[11px] text-muted-foreground tracking-widest uppercase">Scroll</span>
            <div className="w-5 h-8 rounded-full border-2 border-border flex items-start justify-center p-1">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
                animate={{ y: [0, 12, 0] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </section>

        {/* ─── STATS ─── */}
        <section className="py-16 px-6 border-t border-border">
          <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl sm:text-4xl font-black text-foreground">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
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
                  className="group relative flex flex-col items-center text-center p-6 rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.12, duration: 0.45 }}
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_0%,var(--accent-blue)_0%,transparent_70%)] opacity-[0.06]" />
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <s.icon className="w-6 h-6 text-accent-blue" />
                    </div>
                    <span className="text-[11px] font-bold text-accent-blue tracking-widest uppercase mb-2">
                      Step {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-lg font-bold mb-1 text-foreground">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
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
                  className="group relative flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-card overflow-hidden cursor-pointer"
                  onClick={() => navigate("/paths")}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.12, duration: 0.45 }}
                  whileHover={{ y: -6, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-14 h-14 rounded-xl ${p.bg} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
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
                  key={v.text}
                  className="group flex items-center gap-3 px-5 py-4 rounded-xl border border-border bg-card transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <div className="w-9 h-9 rounded-lg bg-accent-emerald/10 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                    <v.icon className="w-4 h-4 text-accent-emerald" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{v.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <section className="py-24 px-6 border-t border-border bg-card/50">
          <div className="max-w-4xl mx-auto">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-center mb-14"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
            >
              What People Say
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  className="p-6 rounded-2xl border border-border bg-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.45 }}
                >
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }, (_, si) => (
                      <motion.div
                        key={si}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 + si * 0.06, type: "spring", stiffness: 400 }}
                      >
                        <Star
                          className={`w-4 h-4 ${si < t.rating ? "text-accent-blue fill-accent-blue" : "text-muted"}`}
                        />
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.text}"</p>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="py-28 px-6 border-t border-border">
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
