import type { CSSProperties } from "react";

const particles = [
  { x: "-5rem", y: "-3.5rem", delay: "0ms", size: "0.28rem" },
  { x: "-2.4rem", y: "-5rem", delay: "45ms", size: "0.2rem" },
  { x: "0.8rem", y: "-5.5rem", delay: "90ms", size: "0.35rem" },
  { x: "3.8rem", y: "-4.2rem", delay: "30ms", size: "0.22rem" },
  { x: "5.2rem", y: "-1.3rem", delay: "115ms", size: "0.3rem" },
  { x: "4.1rem", y: "2.7rem", delay: "75ms", size: "0.18rem" },
  { x: "0.6rem", y: "4.6rem", delay: "140ms", size: "0.32rem" },
  { x: "-3.4rem", y: "3.7rem", delay: "60ms", size: "0.24rem" },
  { x: "-5.1rem", y: "0.9rem", delay: "120ms", size: "0.36rem" },
];

/** A visual-only reward that is mounted only for a real Focus Mode completion event. */
export function AtlasMissionCelebration() {
  return (
    <div className="atlas-mission-celebration" aria-live="polite" role="status">
      <span className="sr-only">Mission completed</span>
      {particles.map((particle) => (
        <span
          key={`${particle.x}-${particle.y}`}
          aria-hidden="true"
          className="atlas-mission-particle"
          style={{
            "--atlas-particle-x": particle.x,
            "--atlas-particle-y": particle.y,
            "--atlas-particle-delay": particle.delay,
            "--atlas-particle-size": particle.size,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
