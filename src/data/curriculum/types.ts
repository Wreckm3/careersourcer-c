// CareerSourcer curriculum types — project-first, mission-based learning.
//
// Every lesson is a MISSION: the learner finishes with something built,
// improved, or accomplished. No history, no academic definitions.

export type Difficulty = "Starter" | "Builder" | "Advanced";

export interface Lesson {
  id: string;
  /** Mission-style title: "Build ...", "Ship ...", "Protect ..." — never "What is X?" */
  title: string;
  /** One-sentence mission objective shown at the top of Focus Mode. */
  mission: string;
  /** One-liner shown in lesson lists. */
  description: string;
  /** Short brief (max ~55 words). Only what's needed to start building. */
  intro: string;
  /** Concrete artifact the learner walks away with. */
  outcome: string;
  /** Curated, beginner-friendly, build-along video (YouTube embed URL). */
  videoUrl: string;
  /** The hands-on build task. */
  challenge: string;
  /** Contextual tool/workflow tip that genuinely helps finish the mission. */
  builderTip: string;
  /** Tools required — free wherever possible. */
  tools: string[];
  difficulty: Difficulty;
  duration: string;
  /** Premium missions unlock with a paid plan. Missions 1–3 stay free. */
  premium?: boolean;
}

export interface Branch {
  id: string;
  title: string;
  emoji: string;
  tagline: string;
  description: string;
  searchKeywords: string[];
  featured: boolean;
  lessons: Lesson[];
}

export interface Category {
  id: string;
  title: string;
  emoji: string;
  description: string;
  icon: string;
  color: string;
  branches: Branch[];
}

/** Helper to build YouTube embeds consistently. */
export const yt = (id: string) => `https://www.youtube.com/embed/${id}`;
