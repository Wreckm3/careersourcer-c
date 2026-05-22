import { motion } from "framer-motion";

/**
 * Gradient Aurora background — slow, drifting curtains of light using
 * the existing brand accent colors. Sits behind everything site-wide.
 */
export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Soft base wash */}
      <div className="absolute inset-0 bg-background" />

      {/* Aurora curtain 1 — blue/purple */}
      <motion.div
        className="absolute -inset-[20%] opacity-[0.18] dark:opacity-[0.28] blur-3xl mix-blend-screen dark:mix-blend-screen"
        style={{
          background:
            "conic-gradient(from 90deg at 50% 50%, transparent 0deg, var(--accent-blue) 60deg, transparent 140deg, var(--accent-purple) 220deg, transparent 320deg)",
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.15, 1],
        }}
        transition={{
          rotate: { duration: 60, repeat: Infinity, ease: "linear" },
          scale: { duration: 18, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      {/* Aurora curtain 2 — emerald/blue ribbon */}
      <motion.div
        className="absolute top-[-10%] left-[-20%] w-[80%] h-[70%] opacity-[0.16] dark:opacity-[0.24] blur-3xl rounded-full mix-blend-screen"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--accent-emerald) 0%, var(--accent-blue) 45%, transparent 70%)",
        }}
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -30, 40, 0],
          scale: [1, 1.2, 0.95, 1],
        }}
        transition={{ duration: 36, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Aurora curtain 3 — purple glow */}
      <motion.div
        className="absolute bottom-[-15%] right-[-15%] w-[70%] h-[70%] opacity-[0.18] dark:opacity-[0.26] blur-3xl rounded-full mix-blend-screen"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--accent-purple) 0%, var(--accent-blue) 50%, transparent 75%)",
        }}
        animate={{
          x: [0, -60, 30, 0],
          y: [0, 30, -40, 0],
          scale: [1, 1.1, 1.25, 1],
        }}
        transition={{ duration: 42, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Horizontal shimmer pass */}
      <motion.div
        className="absolute inset-x-0 top-1/3 h-[40%] opacity-[0.1] dark:opacity-[0.15] blur-2xl mix-blend-screen"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--accent-blue), var(--accent-purple), var(--accent-emerald), transparent)",
        }}
        animate={{ x: ["-30%", "30%", "-30%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
