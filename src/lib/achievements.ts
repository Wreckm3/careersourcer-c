/**
 * Achievements — derived, never stored.
 *
 * Every badge is a pure function of curriculum data + progress, so a user's
 * badges are always consistent with what they actually completed. No table,
 * no sync, no drift.
 */

import { categories } from "@/data/curriculum";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** lucide-react icon name resolved by the UI. */
  icon: "Rocket" | "Flame" | "Trophy" | "Layers" | "Star" | "Crown";
  earned: boolean;
  /** 0–1 progress toward earning it. */
  progress: number;
  hint: string;
}

export interface AchievementInput {
  completedSessions: string[];
  streakCurrent: number;
  streakDays: string[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function computeAchievements({
  completedSessions,
  streakCurrent,
  streakDays,
}: AchievementInput): Achievement[] {
  const done = new Set(completedSessions);
  const allLessons = categories.flatMap((c) => c.branches.flatMap((b) => b.lessons));
  const completedCount = allLessons.filter((l) => done.has(l.id)).length;

  const branchesFinished = categories
    .flatMap((c) => c.branches)
    .filter((b) => b.lessons.length > 0 && b.lessons.every((l) => done.has(l.id))).length;

  const categoriesTouched = categories.filter((c) =>
    c.branches.some((b) => b.lessons.some((l) => done.has(l.id)))
  ).length;

  const bestStreak = Math.max(streakCurrent, longestStreak(streakDays));

  return [
    {
      id: "first-build",
      name: "First Build",
      description: "Complete your first mission.",
      icon: "Rocket",
      earned: completedCount >= 1,
      progress: clamp01(completedCount / 1),
      hint: "Finish one mission end to end.",
    },
    {
      id: "streak-7",
      name: "Week of Momentum",
      description: "Build 7 days in a row.",
      icon: "Flame",
      earned: bestStreak >= 7,
      progress: clamp01(bestStreak / 7),
      hint: `${bestStreak}/7 days`,
    },
    {
      id: "ten-missions",
      name: "Ten Shipped",
      description: "Complete 10 missions.",
      icon: "Star",
      earned: completedCount >= 10,
      progress: clamp01(completedCount / 10),
      hint: `${completedCount}/10 missions`,
    },
    {
      id: "branch-master",
      name: "Branch Finisher",
      description: "Finish every mission in one branch.",
      icon: "Trophy",
      earned: branchesFinished >= 1,
      progress: clamp01(branchesFinished / 1),
      hint: branchesFinished > 0 ? `${branchesFinished} branches finished` : "Finish a full branch",
    },
    {
      id: "cross-discipline",
      name: "Cross-Discipline",
      description: "Build in all three categories.",
      icon: "Layers",
      earned: categoriesTouched >= 3,
      progress: clamp01(categoriesTouched / 3),
      hint: `${categoriesTouched}/3 categories`,
    },
    {
      id: "portfolio-25",
      name: "Portfolio Builder",
      description: "Complete 25 missions.",
      icon: "Crown",
      earned: completedCount >= 25,
      progress: clamp01(completedCount / 25),
      hint: `${completedCount}/25 missions`,
    },
  ];
}

function longestStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const sorted = [...new Set(days)].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]).getTime();
    const cur = new Date(sorted[i]).getTime();
    run = cur - prev === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export interface PortfolioItem {
  lessonId: string;
  title: string;
  outcome: string;
  tools: string[];
  categoryId: string;
  categoryTitle: string;
  branchId: string;
  branchTitle: string;
  color: string;
}

/** Completed missions projected as portfolio-ready artifacts. */
export function buildPortfolio(completedSessions: string[]): PortfolioItem[] {
  const done = new Set(completedSessions);
  const items: PortfolioItem[] = [];
  for (const category of categories) {
    for (const branch of category.branches) {
      for (const lesson of branch.lessons) {
        if (!done.has(lesson.id)) continue;
        items.push({
          lessonId: lesson.id,
          title: lesson.title,
          outcome: lesson.outcome,
          tools: lesson.tools,
          categoryId: category.id,
          categoryTitle: category.title,
          branchId: branch.id,
          branchTitle: branch.title,
          color: category.color,
        });
      }
    }
  }
  return items;
}
