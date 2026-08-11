/**
 * XP + levels — derived, never stored.
 *
 * XP is a pure function of completed lesson ids: base XP per lesson scaled by
 * the phase multiplier, plus bonuses for finishing missions, modules,
 * projects and phases. Nothing to sync, nothing to drift.
 */

import { categories } from "@/data/curriculum";
import type { PhaseId } from "@/data/curriculum/phaseTypes";
import {
  computeMissionProgress,
  computeModuleProgress,
  computePhaseProgress,
  isProjectUnlocked,
  resolveBranchPhases,
} from "./engine";

export const XP_RULES = {
  lessonBase: 50,
  missionBonus: 100,
  moduleBonus: 250,
  projectBonus: 400,
  phaseBonus: 750,
  /** XP awarded per day of the current streak, capped. */
  streakPerDay: 10,
  streakCap: 300,
} as const;

export interface XpBreakdown {
  lessons: number;
  missions: number;
  modules: number;
  projects: number;
  phases: number;
  streak: number;
  total: number;
}

export interface LevelInfo {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  percentToNextLevel: number;
}

export interface BranchXp {
  branchId: string;
  xp: number;
  byPhase: Record<PhaseId, number>;
}

/** Every 1000 XP is a level; titles map loosely onto the phase ladder. */
const LEVEL_SIZE = 1000;
const LEVEL_TITLES = [
  "Newcomer",
  "Explorer",
  "Maker",
  "Builder",
  "Shipper",
  "Craftsperson",
  "Professional",
  "Specialist",
  "Elite",
];

export function computeXp(completedIds: string[], streakCurrent = 0): XpBreakdown {
  const breakdown: XpBreakdown = {
    lessons: 0,
    missions: 0,
    modules: 0,
    projects: 0,
    phases: 0,
    streak: Math.min(streakCurrent * XP_RULES.streakPerDay, XP_RULES.streakCap),
    total: 0,
  };

  const done = new Set(completedIds);

  for (const category of categories) {
    for (const branch of category.branches) {
      for (const phase of resolveBranchPhases(branch)) {
        if (!phase.hasContent) continue;
        const multiplier = phase.definition.xpMultiplier;

        for (const module of phase.modules) {
          for (const mission of module.missions) {
            const completedLessons = mission.lessons.filter((l) => done.has(l.id)).length;
            breakdown.lessons += completedLessons * XP_RULES.lessonBase * multiplier;
            if (computeMissionProgress(mission, completedIds).isComplete) {
              breakdown.missions += XP_RULES.missionBonus * multiplier;
            }
          }
          if (computeModuleProgress(module, completedIds).isComplete) {
            breakdown.modules += XP_RULES.moduleBonus * multiplier;
          }
          if (module.project && isProjectUnlocked(module, completedIds)) {
            breakdown.projects += XP_RULES.projectBonus * multiplier;
          }
        }

        if (computePhaseProgress(phase, completedIds).isComplete) {
          breakdown.phases += XP_RULES.phaseBonus * multiplier;
        }
      }
    }
  }

  breakdown.lessons = Math.round(breakdown.lessons);
  breakdown.missions = Math.round(breakdown.missions);
  breakdown.modules = Math.round(breakdown.modules);
  breakdown.projects = Math.round(breakdown.projects);
  breakdown.phases = Math.round(breakdown.phases);
  breakdown.total =
    breakdown.lessons +
    breakdown.missions +
    breakdown.modules +
    breakdown.projects +
    breakdown.phases +
    breakdown.streak;

  return breakdown;
}

export function computeLevel(totalXp: number): LevelInfo {
  const level = Math.floor(totalXp / LEVEL_SIZE) + 1;
  const xpIntoLevel = totalXp % LEVEL_SIZE;
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    xpIntoLevel,
    xpForNextLevel: LEVEL_SIZE,
    percentToNextLevel: Math.round((xpIntoLevel / LEVEL_SIZE) * 100),
  };
}

/** XP attributable to one branch — used by the dashboard and Atlas. */
export function computeBranchXp(branchId: string, completedIds: string[]): BranchXp {
  const done = new Set(completedIds);
  const byPhase = { explorer: 0, builder: 0, professional: 0, elite: 0 } as Record<PhaseId, number>;

  for (const phase of resolveBranchPhases(branchId)) {
    const multiplier = phase.definition.xpMultiplier;
    let xp = 0;
    for (const module of phase.modules) {
      for (const mission of module.missions) {
        xp += mission.lessons.filter((l) => done.has(l.id)).length * XP_RULES.lessonBase * multiplier;
        if (computeMissionProgress(mission, completedIds).isComplete) {
          xp += XP_RULES.missionBonus * multiplier;
        }
      }
      if (computeModuleProgress(module, completedIds).isComplete) xp += XP_RULES.moduleBonus * multiplier;
      if (module.project && isProjectUnlocked(module, completedIds)) {
        xp += XP_RULES.projectBonus * multiplier;
      }
    }
    if (computePhaseProgress(phase, completedIds).isComplete) xp += XP_RULES.phaseBonus * multiplier;
    byPhase[phase.definition.id] = Math.round(xp);
  }

  return {
    branchId,
    xp: Object.values(byPhase).reduce((sum, value) => sum + value, 0),
    byPhase,
  };
}
