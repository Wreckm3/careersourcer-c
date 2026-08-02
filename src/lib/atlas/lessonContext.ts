/**
 * Atlas integration hooks (Phase 4 prep — Atlas itself is NOT built yet).
 *
 * Every mission emits a stable, serialisable snapshot of what the learner is
 * doing and what they walked away with. When Atlas ships it consumes exactly
 * this shape to personalise recommendations — no curriculum changes required.
 *
 * Nothing here writes to the backend. It is a pure projection of curriculum
 * data + local/cloud progress.
 */

import type { Category, Branch, Lesson, Difficulty } from "@/data/curriculum/types";

export type SkillLevel = "beginner" | "intermediate" | "advanced";

const LEVEL_BY_DIFFICULTY: Record<Difficulty, SkillLevel> = {
  Starter: "beginner",
  Builder: "intermediate",
  Advanced: "advanced",
};

export interface AtlasLessonContext {
  /** Where the learner currently sits on this branch. */
  skillLevel: SkillLevel;
  categoryId: string;
  branchId: string;
  lessonId: string;
  /** The mission objective, verbatim. */
  mission: string;
  /** Has this mission been completed by the learner? */
  missionCompleted: boolean;
  /** Tools this mission puts in the learner's hands. */
  toolsLearned: string[];
  /** The tangible artifact — present once the mission is completed. */
  projectCompleted: string | null;
  /** Branch-level progress data. */
  progress: {
    lessonIndex: number;
    totalLessons: number;
    completedInBranch: number;
    percentBranch: number;
    streakCurrent: number;
  };
  /** What comes next, so Atlas can nudge without recomputing the curriculum. */
  nextMission: { id: string; title: string; mission: string } | null;
}

export interface BuildAtlasContextArgs {
  category: Category;
  branch: Branch;
  lesson: Lesson;
  lessonIndex: number;
  totalLessons: number;
  nextLesson?: Lesson | null;
  isCompleted: (lessonId: string) => boolean;
  streakCurrent: number;
}

export function buildAtlasLessonContext({
  category,
  branch,
  lesson,
  lessonIndex,
  totalLessons,
  nextLesson,
  isCompleted,
  streakCurrent,
}: BuildAtlasContextArgs): AtlasLessonContext {
  const completedInBranch = branch.lessons.filter((l) => isCompleted(l.id)).length;
  const done = isCompleted(lesson.id);

  return {
    skillLevel: LEVEL_BY_DIFFICULTY[lesson.difficulty],
    categoryId: category.id,
    branchId: branch.id,
    lessonId: lesson.id,
    mission: lesson.mission,
    missionCompleted: done,
    toolsLearned: lesson.tools,
    projectCompleted: done ? lesson.outcome : null,
    progress: {
      lessonIndex,
      totalLessons,
      completedInBranch,
      percentBranch: totalLessons ? Math.round((completedInBranch / totalLessons) * 100) : 0,
      streakCurrent,
    },
    nextMission: nextLesson
      ? { id: nextLesson.id, title: nextLesson.title, mission: nextLesson.mission }
      : null,
  };
}

/**
 * Emitted on mission completion. Atlas (and later analytics) can subscribe via
 * `window.addEventListener("atlas:mission", ...)` without any coupling to the UI.
 */
export const ATLAS_MISSION_EVENT = "atlas:mission";

export function emitAtlasMission(context: AtlasLessonContext) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ATLAS_MISSION_EVENT, { detail: context }));
}

/**
 * Learner profile — Atlas's memory surface.
 *
 * Premium Atlas will remember progress, suggest projects, break them into
 * milestones and recommend lessons. That all needs the same input: a compact
 * projection of what the learner has already built. This builds it from
 * curriculum data + completed mission ids, with a `goals` slot reserved for
 * learner-stated goals once they are captured/persisted.
 */
export interface AtlasLearnerProfile {
  missionsCompleted: number;
  streakCurrent: number;
  activeBranches: { branchId: string; title: string; completed: number; total: number }[];
  completedBranches: string[];
  recentOutcomes: string[];
  goals?: string[];
}

export function buildAtlasLearnerProfile(
  categoriesData: Category[],
  completedSessions: string[],
  streakCurrent: number,
  goals: string[] = [],
): AtlasLearnerProfile {
  const done = new Set(completedSessions);
  const activeBranches: AtlasLearnerProfile["activeBranches"] = [];
  const completedBranches: string[] = [];
  const recentOutcomes: string[] = [];

  for (const category of categoriesData) {
    for (const branch of category.branches) {
      const completed = branch.lessons.filter((l) => done.has(l.id)).length;
      if (completed === 0) continue;
      if (completed === branch.lessons.length) completedBranches.push(branch.title);
      else activeBranches.push({ branchId: branch.id, title: branch.title, completed, total: branch.lessons.length });
      for (const lesson of branch.lessons) {
        if (done.has(lesson.id)) recentOutcomes.push(lesson.outcome);
      }
    }
  }

  return {
    missionsCompleted: completedSessions.length,
    streakCurrent,
    activeBranches: activeBranches.slice(0, 20),
    completedBranches: completedBranches.slice(0, 30),
    recentOutcomes: recentOutcomes.slice(-10),
    goals: goals.length ? goals.slice(0, 5) : undefined,
  };
}
