import { Category, Branch, Lesson } from "./types";
import { technology } from "./technology";
import { business } from "./business";
import { creative } from "./creative";

export * from "./types";

export const categories: Category[] = [technology, business, creative];

// ──────────────── Helpers ────────────────

export function getCategory(categoryId: string): Category | undefined {
  return categories.find((c) => c.id === categoryId);
}

export function getBranch(
  categoryId: string,
  branchId: string
): { category: Category; branch: Branch } | undefined {
  const category = getCategory(categoryId);
  if (!category) return undefined;
  const branch = category.branches.find((b) => b.id === branchId);
  if (!branch) return undefined;
  return { category, branch };
}

// Lessons are uniquely identified by branch+lesson id; search across all categories.
export function getLesson(
  branchId: string,
  lessonId: string
):
  | {
      category: Category;
      branch: Branch;
      lesson: Lesson;
      lessonIndex: number;
      totalLessons: number;
    }
  | undefined {
  for (const category of categories) {
    const branch = category.branches.find((b) => b.id === branchId);
    if (!branch) continue;
    const idx = branch.lessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) continue;
    return {
      category,
      branch,
      lesson: branch.lessons[idx],
      lessonIndex: idx + 1,
      totalLessons: branch.lessons.length,
    };
  }
  return undefined;
}

export function getNextLesson(branchId: string, currentLessonId: string): Lesson | undefined {
  for (const category of categories) {
    const branch = category.branches.find((b) => b.id === branchId);
    if (!branch) continue;
    const idx = branch.lessons.findIndex((l) => l.id === currentLessonId);
    if (idx === -1 || idx >= branch.lessons.length - 1) return undefined;
    return branch.lessons[idx + 1];
  }
  return undefined;
}

export function getBranchProgress(
  branch: Branch,
  completedIds: string[]
): { completed: number; total: number; percent: number } {
  const total = branch.lessons.length;
  const completed = branch.lessons.filter((l) => completedIds.includes(l.id)).length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// Guided search: returns ranked branch matches for a free-text query.
export function searchBranches(query: string): { category: Category; branch: Branch; score: number }[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const words = q.split(/\s+/).filter(Boolean);
  const results: { category: Category; branch: Branch; score: number }[] = [];

  for (const category of categories) {
    for (const branch of category.branches) {
      let score = 0;
      const haystack = [
        branch.title.toLowerCase(),
        branch.tagline.toLowerCase(),
        branch.description.toLowerCase(),
        ...branch.searchKeywords.map((k) => k.toLowerCase()),
      ];
      for (const word of words) {
        for (const hay of haystack) {
          if (hay === word) score += 5;
          else if (hay.includes(word)) score += 2;
        }
      }
      if (score > 0) results.push({ category, branch, score });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 4);
}
