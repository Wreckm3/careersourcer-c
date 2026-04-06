import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Compass, ArrowRight, Target, Zap, TrendingUp, Users, BookOpen, Award } from "lucide-react";
import { PageTransition } from "@/components/career/PageTransition";
import { useEffect, useState, useRef } from "react";

function useTypingEffect(words: string[], speed = 100, pause = 2000) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setText(current.slice(0, text.length + 1));
        if (text === current) {
          setTimeout(() => setIsDeleting(true), pause);
        }
      } else {
        setText(current.slice(0, text.length - 1));
        if (text === "") {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, isDeleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex, words, speed, pause]);

  return text;
}

function AnimatedCounter({ target, label, duration = 2 }: { target: number; label: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration * 60);
    const interval = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [started, target, duration]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl md:text-5xl font-black text-foreground">{count.toLocaleString()}+</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

const features = [
  { icon: Target, title: "Guided Paths", desc: "Structured learning across Technology, Business & Data" },
  { icon: Zap, title: "Focus Mode", desc: "Distraction-free sessions for deep learning" },
  { icon: TrendingUp, title: "Track Progress", desc: "Visual progress tracking across all your paths" },
  { icon: BookOpen, title: "Bite-Sized", desc: "5–10 minute sessions that fit your schedule" },
];

const testimonials = [
  { name: "Alex M.", role: "Software Developer", quote: "This platform helped me build a clear learning routine." },
  { name: "Sarah K.", role: "Business Analyst", quote: "Focus Mode is a game-changer for staying on track." },
  { name: "David R.", role: "Data Enthusiast", quote: "Finally, a platform that respects my time." },
];

export default function Landing() {
  const navigate = useNavigate();
  const typedWord = useTypingEffect(["Direction", "Future", "Career", "Skills"], 80, 1800);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background overflow-x-hidden">
        {/* Hero */}
        <motion.section
          ref={heroRef}
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="min-h-screen flex flex-col items-center justify-center px-4 relative"
        >
          <motion.div
            className="flex flex-col items-center text-center max-w-3xl gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              className="p-4 rounded-2xl bg-accent-blue/10 mb-2"
              initial={{ rotate: -10, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            >
              <Compass className="w-12 h-12 text-accent-blue" />
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
              Build Your{" "}
              <span className="text-accent-blue inline-block min-w-[200px] text-left">
                {typedWord}
                <motion.span
                  className="inline-block w-[3px] h-[1em] bg-accent-blue ml-1 align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                />
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg">
              A focused, distraction-free platform for structured self-growth.
              Choose a path. Complete sessions. Grow with clarity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <motion.button
                onClick={() => navigate("/paths")}
                className="group flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-accent-blue text-primary-foreground text-lg font-semibold transition-all duration-200 hover:shadow-xl hover:shadow-accent-blue/20"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Your Path
                <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
              </motion.button>
              <motion.button
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border text-foreground font-semibold transition-all duration-200 hover:bg-muted"
                whileTap={{ scale: 0.98 }}
              >
                Learn More
              </motion.button>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 flex flex-col items-center gap-2"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <span className="text-xs text-muted-foreground">Scroll</span>
            <div className="w-5 h-8 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                animate={{ y: [0, 12, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.section>

        {/* Stats */}
        <section className="py-20 px-4 border-t border-border bg-card/50">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            <AnimatedCounter target={3} label="Learning Paths" />
            <AnimatedCounter target={30} label="Sessions" />
            <AnimatedCounter target={100} label="Minutes of Content" />
            <AnimatedCounter target={500} label="Learners" />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
                Everything You Need to <span className="text-accent-emerald">Grow</span>
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Simple tools designed for focused, consistent self-improvement.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  className="group p-8 rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-default"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <f.icon className="w-6 h-6 text-accent-blue" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 px-4 bg-card/50 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <motion.h2
              className="text-3xl md:text-4xl font-black tracking-tight text-center mb-16"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              How It <span className="text-accent-purple">Works</span>
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {[
                { step: "01", title: "Choose a Path", desc: "Pick Technology, Business, or Data based on your goals.", icon: Compass },
                { step: "02", title: "Complete Sessions", desc: "Watch short videos and complete simple tasks.", icon: BookOpen },
                { step: "03", title: "Track & Grow", desc: "See your progress and keep building momentum.", icon: Award },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  className="relative text-center flex flex-col items-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                >
                  <motion.div
                    className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-4"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <item.icon className="w-7 h-7 text-accent-purple" />
                  </motion.div>
                  <span className="text-xs font-bold text-accent-purple mb-2">STEP {item.step}</span>
                  <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <motion.h2
              className="text-3xl md:text-4xl font-black tracking-tight text-center mb-16"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              What Learners <span className="text-accent-emerald">Say</span>
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  className="p-6 rounded-2xl border border-border bg-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, si) => (
                      <motion.span
                        key={si}
                        className="text-yellow-400 text-sm"
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 + si * 0.05 }}
                      >★</motion.span>
                    ))}
                  </div>
                  <p className="text-sm text-foreground mb-4 italic">"{t.quote}"</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4 border-t border-border">
          <motion.div
            className="max-w-2xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
              Ready to Start?
            </h2>
            <p className="text-muted-foreground mb-8">
              Pick a path and begin your journey today. No sign-up required.
            </p>
            <motion.button
              onClick={() => navigate("/paths")}
              className="group inline-flex items-center gap-3 px-10 py-4 rounded-xl bg-accent-blue text-primary-foreground text-lg font-semibold hover:shadow-xl hover:shadow-accent-blue/20"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </motion.button>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Career Compass. Built for focused growth.
          </p>
        </footer>
      </div>
    </PageTransition>
  );
}
