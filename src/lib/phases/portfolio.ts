/**
 * Portfolio bridge for the phase system.
 *
 * Legacy portfolio items (one per completed lesson) stay exactly as they are
 * in `src/lib/achievements.ts`. This adds the *project-level* view: a module
 * capstone becomes a portfolio project once its required lessons are done.
 */

import { categories } from "@/data/curriculum";
import type { PhaseId } from "@/data/curriculum/phaseTypes";
import { getPortfolioRecord } from "@/lib/portfolio";
import { isProjectUnlocked, resolveBranchPhases } from "./engine";

export interface PortfolioProject {
  projectId: string;
  title: string;
  summary: string;
  deliverables: string[];
  skills: string[];
  phase: PhaseId;
  phaseTitle: string;
  branchId: string;
  branchTitle: string;
  categoryId: string;
  categoryTitle: string;
  color: string;
  /** True when every required lesson is completed. */
  earned: boolean;
  completedLessons: number;
  totalLessons: number;
  reviewable: boolean;
  /** Learner-supplied evidence, if any lesson record carries it. */
  notes: string | null;
}

export function buildPhasePortfolio(completedIds: string[]): PortfolioProject[] {
  const done = new Set(completedIds);
  const items: PortfolioProject[] = [];

  for (const category of categories) {
    for (const branch of category.branches) {
      for (const phase of resolveBranchPhases(branch)) {
        for (const module of phase.modules) {
          const project = module.project;
          if (!project) continue;
          const total = project.requiredLessonIds.length;
          const completed = project.requiredLessonIds.filter((id) => done.has(id)).length;
          if (completed === 0) continue;

          const notes =
            project.requiredLessonIds
              .map((id) => getPortfolioRecord(id)?.notes)
              .filter(Boolean)
              .join("\n\n") || null;

          items.push({
            projectId: project.id,
            title: project.title,
            summary: project.summary,
            deliverables: project.deliverables,
            skills: project.skills,
            phase: phase.definition.id,
            phaseTitle: phase.definition.title,
            branchId: branch.id,
            branchTitle: branch.title,
            categoryId: category.id,
            categoryTitle: category.title,
            color: category.color,
            earned: isProjectUnlocked(module, completedIds),
            completedLessons: completed,
            totalLessons: total,
            reviewable: project.reviewable,
            notes,
          });
        }
      }
    }
  }

  return items.sort((a, b) => Number(b.earned) - Number(a.earned));
}
