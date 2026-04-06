import { motion } from "framer-motion";

const orbs = [
  { size: 300, x: "10%", y: "20%", color: "var(--accent-blue)", delay: 0, duration: 20 },
  { size: 250, x: "80%", y: "10%", color: "var(--accent-purple)", delay: 2, duration: 25 },
  { size: 200, x: "50%", y: "70%", color: "var(--accent-emerald)", delay: 4, duration: 22 },
  { size: 180, x: "20%", y: "80%", color: "var(--accent-purple)", delay: 1, duration: 18 },
  { size: 220, x: "70%", y: "60%", color: "var(--accent-blue)", delay: 3, duration: 24 },
];

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-[0.07] dark:opacity-[0.05] blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -25, 15, -10, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}
