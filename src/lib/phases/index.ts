/**
 * Phase system public API.
 *
 * Import from `@/lib/phases` — never reach into the individual modules from
 * components, so the internals can change without touching the UI.
 */

export * from "./engine";
export * from "./xp";
export * from "./portfolio";
export * from "./atlasBridge";
export { usePhases } from "./usePhases";
export {
  PHASES,
  PHASE_ORDER,
  phaseRank,
  getPhase,
} from "@/data/curriculum/phaseTypes";
export type {
  BranchPhaseContent,
  PhaseDefinition,
  PhaseId,
  PhaseLesson,
  PhaseProject,
  Mission,
  Module,
} from "@/data/curriculum/phaseTypes";
export {
  phaseContent,
  getBranchPhaseContent,
  validatePhaseContent,
} from "@/data/curriculum/phaseContent";
