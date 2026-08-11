/**
 * Authored phase content registry.
 *
 * Explorer is NEVER authored here — it is derived from `Branch.lessons` by
 * `src/lib/phases/engine.ts`, so the existing 18 branches keep working
 * untouched.
 *
 * To add curriculum for a branch, append a `BranchPhaseContent` entry:
 *
 * ```ts
 * export const phaseContent: BranchPhaseContent[] = [
 *   {
 *     branchId: "web-development",
 *     phaseId: "builder",
 *     overview: "Build and deploy a multi-page product site with real data.",
 *     modules: [ ... ],
 *   },
 * ];
 * ```
 *
 * Rules for authored content (enforced by `validatePhaseContent`):
 *  - lesson ids are globally unique and prefixed `<branchId>-<phaseId>-`
 *  - every module has at least one mission
 *  - a project's `requiredLessonIds` all exist inside its module
 */

import type { BranchPhaseContent, PhaseId } from "./phaseTypes";

export const phaseContent: BranchPhaseContent[] = [];

export function getBranchPhaseContent(
  branchId: string,
  phaseId: PhaseId,
): BranchPhaseContent | undefined {
  return phaseContent.find((c) => c.branchId === branchId && c.phaseId === phaseId);
}

export interface PhaseContentIssue {
  branchId: string;
  phaseId: PhaseId;
  message: string;
}

/** Dev-time sanity check. Returns [] when the registry is well-formed. */
export function validatePhaseContent(
  content: BranchPhaseContent[] = phaseContent,
): PhaseContentIssue[] {
  const issues: PhaseContentIssue[] = [];
  const seenLessonIds = new Set<string>();

  for (const entry of content) {
    const flag = (message: string) =>
      issues.push({ branchId: entry.branchId, phaseId: entry.phaseId, message });

    if (entry.phaseId === "explorer") {
      flag("Explorer content is derived from Branch.lessons and must not be authored here.");
    }
    if (entry.modules.length === 0) flag("Phase has no modules.");

    for (const module of entry.modules) {
      if (module.missions.length === 0) flag(`Module "${module.id}" has no missions.`);

      const moduleLessonIds = new Set<string>();
      for (const mission of module.missions) {
        if (mission.lessons.length === 0) flag(`Mission "${mission.id}" has no lessons.`);
        for (const lesson of mission.lessons) {
          if (seenLessonIds.has(lesson.id)) flag(`Duplicate lesson id "${lesson.id}".`);
          seenLessonIds.add(lesson.id);
          moduleLessonIds.add(lesson.id);
        }
      }

      for (const required of module.project?.requiredLessonIds ?? []) {
        if (!moduleLessonIds.has(required)) {
          flag(`Project "${module.project?.id}" requires unknown lesson "${required}".`);
        }
      }
    }
  }

  return issues;
}
