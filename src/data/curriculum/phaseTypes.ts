/**
 * Phase architecture types.
 *
 * These sit ON TOP of the existing curriculum (`Category → Branch → Lesson`).
 * The legacy shape is untouched: Explorer is *derived* from `Branch.lessons`,
 * so every branch already has a valid Phase tree with zero authored content.
 *
 * Hierarchy:
 *   Phase → Module → Mission → Lesson
 *                 ↘ Project (capstone of a module)
 *
 * A `PhaseLesson` is intentionally a superset-compatible alias of the legacy
 * `Lesson`: any authored lesson can be reused by the legacy Focus Mode.
 */

import type { Difficulty, Lesson, LessonResource } from "./types";
import type { Tier } from "@/lib/tiers";

export type PhaseId = "explorer" | "builder" | "professional" | "elite";

export const PHASE_ORDER: PhaseId[] = ["explorer", "builder", "professional", "elite"];

export interface PhaseDefinition {
  id: PhaseId;
  title: string;
  /** One-line promise of the phase. */
  promise: string;
  /** What the learner is expected to already be able to do. */
  entryExpectation: string;
  /** Minimum subscription tier required to open the phase content. */
  requiredTier: Tier;
  /** Phase that must be completed before this one unlocks (null = always open). */
  requires: PhaseId | null;
  /** XP multiplier applied to every lesson completed inside this phase. */
  xpMultiplier: number;
}

/** A lesson inside the phase system. Structurally compatible with legacy `Lesson`. */
export type PhaseLesson = Lesson;

export interface PhaseProject {
  id: string;
  title: string;
  /** What the finished project is, in one sentence. */
  summary: string;
  /** Concrete, reviewable deliverables. */
  deliverables: string[];
  /** Skills the finished project evidences — feeds the portfolio. */
  skills: string[];
  /** Lesson ids that must be completed before the project is considered ready. */
  requiredLessonIds: string[];
  /** Whether learners can submit an artifact for Atlas review. */
  reviewable: boolean;
  estimatedEffort: string;
  resources?: LessonResource[];
}

export interface Mission {
  id: string;
  title: string;
  /** One-sentence objective. */
  objective: string;
  outcome: string;
  difficulty: Difficulty;
  lessons: PhaseLesson[];
  /** Mission ids inside the same module that must be completed first. */
  dependencies?: string[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  missions: Mission[];
  /** Optional capstone that closes the module. */
  project?: PhaseProject;
  /** Module ids inside the same phase that must be completed first. */
  dependencies?: string[];
}

/** Authored content for one phase of one branch. */
export interface BranchPhaseContent {
  branchId: string;
  phaseId: PhaseId;
  /** Short description shown on the phase card before entering. */
  overview: string;
  modules: Module[];
}

// ──────────────── Phase registry ────────────────

export const PHASES: Record<PhaseId, PhaseDefinition> = {
  explorer: {
    id: "explorer",
    title: "Explorer",
    promise: "Ship your first real thing and find out what you enjoy building.",
    entryExpectation: "No prior experience required.",
    requiredTier: "free",
    requires: null,
    xpMultiplier: 1,
  },
  builder: {
    id: "builder",
    title: "Builder",
    promise: "Turn scattered skills into complete, working projects you can show.",
    entryExpectation: "Finished the Explorer foundation project for this branch.",
    requiredTier: "builder",
    requires: "explorer",
    xpMultiplier: 1.5,
  },
  professional: {
    id: "professional",
    title: "Professional",
    promise: "Work to a client-grade standard: scope, quality bar, delivery.",
    entryExpectation: "Completed the Builder phase for this branch.",
    requiredTier: "creator",
    requires: "builder",
    xpMultiplier: 2,
  },
  elite: {
    id: "elite",
    title: "Elite",
    promise: "Operate independently — own systems, mentor others, earn from the work.",
    entryExpectation: "Completed the Professional phase for this branch.",
    requiredTier: "visionary",
    requires: "professional",
    xpMultiplier: 3,
  },
};

export const getPhase = (id: PhaseId): PhaseDefinition => PHASES[id];

export const phaseRank = (id: PhaseId): number => PHASE_ORDER.indexOf(id);
