/**
 * `usePhases` — the read API components should use for the phase system.
 *
 * Wraps the derived engine with the learner's live progress and tier, so UI
 * never has to thread `completedSessions` / `tier` around by hand.
 */

import { useMemo } from "react";
import { useProgress } from "@/hooks/useProgress";
import { useSubscription } from "@/hooks/useSubscription";
import type { PhaseId } from "@/data/curriculum/phaseTypes";
import {
  computeBranchPhaseStates,
  getNextPhaseLessonId,
  listBranchProjects,
  locatePhaseLesson,
  resolveBranchPhases,
  type PhaseState,
} from "./engine";
import { buildAtlasPhaseSnapshot, describePhasePosition } from "./atlasBridge";
import { buildPhasePortfolio } from "./portfolio";
import { computeLevel, computeXp } from "./xp";

export function usePhases(branchId?: string | null) {
  const { progress } = useProgress();
  const { tier } = useSubscription();
  const completed = progress.completedSessions;
  const activeBranchId = branchId ?? progress.selectedPath ?? null;

  return useMemo(() => {
    const xp = computeXp(completed, progress.streakCurrent);
    const level = computeLevel(xp.total);
    const states: PhaseState[] = activeBranchId
      ? computeBranchPhaseStates(activeBranchId, completed, tier)
      : [];
    const atlasSnapshot = buildAtlasPhaseSnapshot(
      activeBranchId,
      completed,
      tier,
      progress.streakCurrent,
    );

    return {
      branchId: activeBranchId,
      tier,
      xp,
      level,
      phases: activeBranchId ? resolveBranchPhases(activeBranchId) : [],
      phaseStates: states,
      currentPhase: (states.find((s) => s.unlocked && !s.isComplete)?.phase.definition.id ??
        null) as PhaseId | null,
      projects: activeBranchId ? listBranchProjects(activeBranchId) : [],
      portfolio: buildPhasePortfolio(completed),
      atlasSnapshot,
      atlasPosition: describePhasePosition(atlasSnapshot),
      locateLesson: locatePhaseLesson,
      nextLessonId: (lessonId: string) => getNextPhaseLessonId(lessonId),
    };
  }, [activeBranchId, completed, progress.streakCurrent, tier]);
}
