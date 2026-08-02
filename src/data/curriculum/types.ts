// CareerSourcer curriculum types — project-first, mission-based learning.
//
// Every lesson is a MISSION: the learner finishes with something built,
// improved, or accomplished. No history, no academic definitions.

export type Difficulty = "Starter" | "Builder" | "Advanced";

/** A genuinely useful link — official docs or a trusted free tool. */
export interface LessonResource {
  label: string;
  url: string;
}

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
  /** 2–3 sentences: why this mission matters for the project being built. */
  whyItMatters?: string;
  /** Concrete artifact the learner walks away with. */
  outcome: string;
  /** Curated, beginner-friendly, build-along video (YouTube embed URL). */
  videoUrl: string;
  /** The hands-on build task. */
  challenge: string;
  /** Contextual tool/workflow tip that genuinely helps finish the mission. */
  builderTip: string;
  /** Extra shortcuts/resources beyond the single builderTip. */
  builderTips?: string[];
  /** Traps beginners fall into on this exact mission. */
  mistakes?: string[];
  /** Named skills the learner walks away with (portfolio-ready). */
  skills?: string[];
  /** Official docs / trusted free tools that support this mission. */
  resources?: LessonResource[];
  /** Reflection prompt shown on completion. */
  reflection?: string;
  /** One-line teaser for the next mission, written from this mission's outcome. */
  nextTeaser?: string;
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
  /** The single project the five foundation missions add up to. */
  projectArc?: {
    /** Name of the thing the learner finishes with. */
    projectName: string;
    /** One sentence describing the finished project. */
    promise: string;
    /** What they can build after finishing the five missions. */
    whatsNext: string[];
  };
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

