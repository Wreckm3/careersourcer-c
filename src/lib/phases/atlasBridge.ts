/**
 * Atlas bridge.
 *
 * Turns the phase engine into a compact, model-readable snapshot Atlas can
 * reason about without knowing the curriculum data shapes. Purely derived —
 * safe to call on every turn.
 */

import { categories } from "@/data/curriculum";
import type { PhaseId } from "@/data/curriculum/phaseTypes";
import type { Tier } from "@/lib/tiers";
import { computeBranchPhaseStates, locatePhaseLesson, type PhaseLockReason } from "./engine";
import { computeLevel, computeXp } from "./xp";

export interface AtlasPhaseSummary {
  phase: PhaseId;
  title: string;
  unlocked: boolean;
  lockedBy: PhaseLockReason;
  completed: number;
  total: number;
  percent: number;
  nextLessonId: string | null;
}

export interface AtlasPhaseSnapshot {
  branchId: string | null;
  branchTitle: string | null;
  currentPhase: PhaseId | null;
  phases: AtlasPhaseSummary[];
  /** Phase the learner would move into next, once unlocked. */
  nextPhase: PhaseId | null;
  nextPhaseBlockedBy: PhaseLockReason;
  xpTotal: number;
  level: number;
  levelTitle: string;
}

export function buildAtlasPhaseSnapshot(
  branchId: string | null | undefined,
  completedIds: string[],
  tier: Tier,
  streakCurrent = 0,
): AtlasPhaseSnapshot {
  const xp = computeXp(completedIds, streakCurrent);
  const level = computeLevel(xp.total);

  if (!branchId) {
    return {
      branchId: null,
      branchTitle: null,
      currentPhase: null,
      phases: [],
      nextPhase: null,
      nextPhaseBlockedBy: null,
      xpTotal: xp.total,
      level: level.level,
      levelTitle: level.title,
    };
  }

  const branchTitle =
    categories.flatMap((c) => c.branches).find((b) => b.id === branchId)?.title ?? null;
  const states = computeBranchPhaseStates(branchId, completedIds, tier);

  const phases: AtlasPhaseSummary[] = states.map((state) => ({
    phase: state.phase.definition.id,
    title: state.phase.definition.title,
    unlocked: state.unlocked,
    lockedBy: state.lockedBy,
    completed: state.completed,
    total: state.total,
    percent: state.percent,
    nextLessonId: state.nextLessonId,
  }));

  const current = states.find((s) => s.unlocked && !s.isComplete) ?? null;
  const next = states.find((s) => !s.unlocked) ?? null;

  return {
    branchId,
    branchTitle,
    currentPhase: current?.phase.definition.id ?? null,
    phases,
    nextPhase: next?.phase.definition.id ?? null,
    nextPhaseBlockedBy: next?.lockedBy ?? null,
    xpTotal: xp.total,
    level: level.level,
    levelTitle: level.title,
  };
}

/** Human-readable one-liner for the mentor brief. */
export function describePhasePosition(snapshot: AtlasPhaseSnapshot): string {
  if (!snapshot.branchId) return "No learning path selected yet.";
  const current = snapshot.phases.find((p) => p.phase === snapshot.currentPhase);
  if (!current) return `${snapshot.branchTitle}: all unlocked phases complete.`;
  return `${snapshot.branchTitle} — ${current.title} phase, ${current.completed}/${current.total} lessons (level ${snapshot.level} ${snapshot.levelTitle}).`;
}

export { locatePhaseLesson };
