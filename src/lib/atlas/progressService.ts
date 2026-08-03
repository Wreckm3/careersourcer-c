import type { Category } from "@/data/curriculum/types";
import type {
  AtlasLearningPathSummary,
  AtlasLessonSummary,
  AtlasMilestone,
  AtlasProgressSnapshot,
  AtlasProject,
} from "./types";

function projectFromCompletedBranch(category: Category, branchId: string, now: string): AtlasProject | null {
  const branch = category.branches.find((candidate) => candidate.id === branchId);
  if (!branch?.projectArc) return null;

  const completedMilestone: AtlasMilestone = {
    id: `${branch.id}-foundation-complete`,
    title: "Complete the foundation project",
    description: branch.projectArc.promise,
    estimatedEffort: "5 missions",
    status: "completed",
    dependencies: [],
    completionPercentage: 100,
    tasks: [],
    resources: [],
  };

  return {
    id: `${branch.id}-foundation-project`,
    title: branch.projectArc.projectName,
    categoryId: category.id,
    branchId: branch.id,
    description: branch.projectArc.promise,
    milestones: [completedMilestone],
    status: "completed",
    completionPercentage: 100,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildAtlasProgressSnapshot(
  categories: Category[],
  completedLessons: string[],
  streakCurrent: number,
  selectedPath?: string | null,
): AtlasProgressSnapshot {
  const completedSet = new Set(completedLessons);
  const completedFoundationPaths: string[] = [];
  const completedProjects: AtlasProject[] = [];
  const completedMilestones: AtlasMilestone[] = [];
  let lastCompletedLesson: AtlasLessonSummary | null = null;
  let currentLearningPath: AtlasLearningPathSummary | null = null;
  const now = new Date().toISOString();

  for (const category of categories) {
    for (const branch of category.branches) {
      if (branch.id === selectedPath) {
        const lessonsCompleted = branch.lessons.filter((lesson) => completedSet.has(lesson.id)).length;
        currentLearningPath = {
          branchId: branch.id,
          title: branch.title,
          categoryTitle: category.title,
          projectName: branch.projectArc?.projectName ?? null,
          lessonsCompleted,
          totalLessons: branch.lessons.length,
          remainingLessons: Math.max(branch.lessons.length - lessonsCompleted, 0),
        };
      }

      const complete = branch.lessons.length > 0 && branch.lessons.every((lesson) => completedSet.has(lesson.id));
      if (!complete) continue;

      completedFoundationPaths.push(branch.id);
      const project = projectFromCompletedBranch(category, branch.id, now);
      if (project) {
        completedProjects.push(project);
        completedMilestones.push(...project.milestones);
      }
    }
  }

  const lastCompletedLessonId = completedLessons[completedLessons.length - 1];
  if (lastCompletedLessonId) {
    for (const category of categories) {
      for (const branch of category.branches) {
        const lesson = branch.lessons.find((candidate) => candidate.id === lastCompletedLessonId);
        if (!lesson) continue;
        lastCompletedLesson = {
          id: lesson.id,
          title: lesson.title,
          mission: lesson.mission,
          outcome: lesson.outcome,
          branchId: branch.id,
          branchTitle: branch.title,
          categoryId: category.id,
          categoryTitle: category.title,
        };
      }
    }
  }

  return {
    completedFoundationPaths,
    completedProjects,
    completedMilestones,
    activeGoals: [],
    activeProjects: [],
    completedLessons,
    lastCompletedLesson,
    currentLearningPath,
    streakCurrent,
  };
}
