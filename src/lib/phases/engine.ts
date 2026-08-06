/**
 * Phase engine.
 *
 * Resolves the Phase → Module → Mission → Lesson tree for any branch, and
 * computes unlock state and progress from the *existing* completed-lesson
 * array. No new persistence: a phase lesson is completed by the same
 * `completeSession(lessonId)` call Focus Mode already makes.
 *
 * Backward compatibility contract:
 *  - Explorer is derived from `Branch.lessons`; branches with no authored
 *    content still resolve to a valid one-phase tree.
 *  - Every legacy lesson id keeps working in Focus Mode and progress.
 */

import { categories, getBranch } from "@/data/curriculum";
import type { Branch, Category, Lesson } from "@/data/curriculum/types";
import {
  PHASES,
  PHASE_ORDER,
  phaseRank,
  type Mission,
  type Module,
  type PhaseDefinition,
  type PhaseId,
  type PhaseProject,
} from "@/data/curriculum/phaseTypes";
import { getBranchPhaseContent } from "@/data/curriculum/phaseContent";
import { meetsTier, type Tier } from "@/lib/tiers";

export interface ResolvedPhase {
  definition: PhaseDefinition;
  branchId: string;
  overview: string;
  modules: Module[];
  /** Every lesson id in the phase, in order. */
  lessonIds: string[];
  /** True when the phase is synthesized from legacy `Branch.lessons`. */
  derived: boolean;
  /** False when no content exists yet (authored phases awaiting curriculum). */
  hasContent: boolean;
}

export type PhaseLockReason = "tier" | "prerequisite" | "no-content" | null;

export interface PhaseProgress {
  completed: number;
  total: number;
  percent: number;
  isComplete: boolean;
}

export interface PhaseState extends PhaseProgress {
  phase: ResolvedPhase;
  unlocked: boolean;
  lockedBy: PhaseLockReason;
  /** Next lesson id the learner should open, if any. */
  nextLessonId: string | null;
}

// ──────────────── Resolution ────────────────

/** Explorer phase synthesized from the legacy branch lessons. */
function deriveExplorer(branch: Branch): ResolvedPhase {
  const mission: Mission = {
    id: `${branch.id}-explorer-foundation`,
    title: branch.projectArc?.projectName ?? `${branch.title} foundation`,
    objective: branch.projectArc?.promise ?? branch.tagline,
    outcome: branch.projectArc?.promise ?? branch.description,
    difficulty: branch.lessons[0]?.difficulty ?? "Starter",
    lessons: branch.lessons,
  };

  const project: PhaseProject | undefined = branch.projectArc
    ? {
        id: `${branch.id}-explorer-project`,
        title: branch.projectArc.projectName,
        summary: branch.projectArc.promise,
        deliverables: branch.projectArc.whatsNext,
        skills: Array.from(
          new Set(branch.lessons.flatMap((l) => l.skills ?? l.tools)),
        ),
        requiredLessonIds: branch.lessons.map((l) => l.id),
        reviewable: true,
        estimatedEffort: `${branch.lessons.length} missions`,
      }
    : undefined;

  const module: Module = {
    id: `${branch.id}-explorer-module`,
    title: "Foundation",
    description: branch.description,
    missions: [mission],
    project,
  };

  return {
    definition: PHASES.explorer,
    branchId: branch.id,
    overview: branch.projectArc?.promise ?? branch.description,
    modules: [module],
    lessonIds: branch.lessons.map((l) => l.id),
    derived: true,
    hasContent: branch.lessons.length > 0,
  };
}

function resolveAuthored(branch: Branch, phaseId: PhaseId): ResolvedPhase {
  const content = getBranchPhaseContent(branch.id, phaseId);
  const modules = content?.modules ?? [];
  return {
    definition: PHASES[phaseId],
    branchId: branch.id,
    overview: content?.overview ?? PHASES[phaseId].promise,
    modules,
    lessonIds: modules.flatMap((m) => m.missions.flatMap((mi) => mi.lessons.map((l) => l.id))),
    derived: false,
    hasContent: modules.length > 0,
  };
}

export function resolvePhase(branchIdOrBranch: string | Branch, phaseId: PhaseId): ResolvedPhase | undefined {
  const branch =
    typeof branchIdOrBranch === "string" ? findBranch(branchIdOrBranch) : branchIdOrBranch;
  if (!branch) return undefined;
  return phaseId === "explorer" ? deriveExplorer(branch) : resolveAuthored(branch, phaseId);
}

/** Full phase tree for a branch, always four entries, in order. */
export function resolveBranchPhases(branchIdOrBranch: string | Branch): ResolvedPhase[] {
  const branch =
    typeof branchIdOrBranch === "string" ? findBranch(branchIdOrBranch) : branchIdOrBranch;
  if (!branch) return [];
  return PHASE_ORDER.map((id) => resolvePhase(branch, id)).filter(
    (p): p is ResolvedPhase => Boolean(p),
  );
}

export function findBranch(branchId: string): Branch | undefined {
  for (const category of categories) {
    const branch = category.branches.find((b) => b.id === branchId);
    if (branch) return branch;
  }
  return undefined;
}

export function findCategoryOfBranch(branchId: string): Category | undefined {
  return categories.find((c) => c.branches.some((b) => b.id === branchId));
}

// ──────────────── Progress + unlocking ────────────────

export function computePhaseProgress(phase: ResolvedPhase, completedIds: string[]): PhaseProgress {
  const done = new Set(completedIds);
  const total = phase.lessonIds.length;
  const completed = phase.lessonIds.filter((id) => done.has(id)).length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    isComplete: total > 0 && completed === total,
  };
}

export function computeMissionProgress(mission: Mission, completedIds: string[]): PhaseProgress {
  const done = new Set(completedIds);
  const total = mission.lessons.length;
  const completed = mission.lessons.filter((l) => done.has(l.id)).length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    isComplete: total > 0 && completed === total,
  };
}

export function computeModuleProgress(module: Module, completedIds: string[]): PhaseProgress {
  const lessons = module.missions.flatMap((m) => m.lessons);
  return computeMissionProgress({ lessons } as Mission, completedIds);
}

/** Is a module's capstone project ready to submit? */
export function isProjectUnlocked(module: Module, completedIds: string[]): boolean {
  if (!module.project) return false;
  const done = new Set(completedIds);
  return module.project.requiredLessonIds.every((id) => done.has(id));
}

/**
 * Unlock state for every phase of a branch.
 * Order of checks: content → prerequisite phase → subscription tier.
 */
export function computeBranchPhaseStates(
  branchId: string,
  completedIds: string[],
  tier: Tier,
): PhaseState[] {
  const phases = resolveBranchPhases(branchId);
  const completionByPhase = new Map<PhaseId, boolean>();

  return phases.map((phase) => {
    const progress = computePhaseProgress(phase, completedIds);
    completionByPhase.set(phase.definition.id, progress.isComplete);

    const requires = phase.definition.requires;
    let lockedBy: PhaseLockReason = null;
    if (!phase.hasContent) lockedBy = "no-content";
    else if (requires && !completionByPhase.get(requires)) lockedBy = "prerequisite";
    else if (!meetsTier(tier, phase.definition.requiredTier)) lockedBy = "tier";

    const nextLessonId =
      lockedBy === null ? phase.lessonIds.find((id) => !completedIds.includes(id)) ?? null : null;

    return { phase, ...progress, unlocked: lockedBy === null, lockedBy, nextLessonId };
  });
}

// ──────────────── Lookup ────────────────

export interface PhaseLessonLocation {
  category: Category;
  branch: Branch;
  phase: ResolvedPhase;
  module: Module;
  mission: Mission;
  lesson: Lesson;
  lessonIndex: number;
  totalLessonsInMission: number;
}

/** Locate a lesson anywhere in the phase tree (legacy Explorer lessons included). */
export function locatePhaseLesson(lessonId: string): PhaseLessonLocation | undefined {
  for (const category of categories) {
    for (const branch of category.branches) {
      for (const phase of resolveBranchPhases(branch)) {
        for (const module of phase.modules) {
          for (const mission of module.missions) {
            const index = mission.lessons.findIndex((l) => l.id === lessonId);
            if (index === -1) continue;
            return {
              category,
              branch,
              phase,
              module,
              mission,
              lesson: mission.lessons[index],
              lessonIndex: index + 1,
              totalLessonsInMission: mission.lessons.length,
            };
          }
        }
      }
    }
  }
  return undefined;
}

/** Next lesson within the phase tree, crossing mission/module boundaries. */
export function getNextPhaseLessonId(lessonId: string): string | null {
  const location = locatePhaseLesson(lessonId);
  if (!location) return null;
  const phases = resolveBranchPhases(location.branch);
  const ordered = phases.flatMap((p) => p.lessonIds);
  const index = ordered.indexOf(lessonId);
  return index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
}

/** All projects (Explorer capstone + authored module projects) for a branch. */
export function listBranchProjects(
  branchId: string,
): { phase: PhaseId; module: Module; project: PhaseProject }[] {
  return resolveBranchPhases(branchId).flatMap((phase) =>
    phase.modules
      .filter((m) => m.project)
      .map((m) => ({ phase: phase.definition.id, module: m, project: m.project as PhaseProject })),
  );
}

export { PHASES, PHASE_ORDER, phaseRank };
export type { PhaseDefinition, PhaseId, Module, Mission, PhaseProject };
