import type {
  AtlasMemory,
  AtlasRecommendation,
  AtlasRecommendationInput,
} from "./types";
import { getCurrentMilestone } from "./projectPlanner";

/**
 * Recommendation engine.
 *
 * Recommendations are ranked, not random. Every candidate carries a base score
 * that is adjusted by the learner's memory — available time, difficulty
 * preference, unresolved struggles, stated goal and recent questions — so two
 * learners on the same mission can get different next steps.
 */

interface Candidate extends AtlasRecommendation {
  score: number;
}

/** Rough minutes the learner has per session, inferred from free text. */
function availableMinutes(memory: AtlasMemory): number | null {
  const raw = memory.timeAvailableForLearning?.toLowerCase();
  if (!raw) return null;
  const number = Number(raw.match(/\d+/)?.[0] ?? NaN);
  if (Number.isNaN(number)) return null;
  return /hour|hr/.test(raw) ? number * 60 : number;
}

/** Parses "20-30 minutes" / "One focused session" into a comparable number. */
function estimateMinutes(estimate: string): number {
  const numbers = estimate.match(/\d+/g);
  if (!numbers) return 30;
  return Math.max(...numbers.map(Number));
}

function difficultyWeight(memory: AtlasMemory, level: "light" | "normal" | "deep") {
  if (memory.preferredDifficulty === "starter") return level === "light" ? 2 : level === "deep" ? -2 : 0;
  if (memory.preferredDifficulty === "advanced") return level === "deep" ? 2 : level === "light" ? -2 : 0;
  return 0;
}

function timeFit(memory: AtlasMemory, estimate: string) {
  const budget = availableMinutes(memory);
  if (!budget) return 0;
  const needed = estimateMinutes(estimate);
  if (needed <= budget) return 2;
  return needed <= budget * 1.5 ? -1 : -3;
}

function unresolvedStruggle(memory: AtlasMemory): string | null {
  const open = memory.struggleLog.filter((entry) => !entry.resolved);
  return open.length ? open[open.length - 1].topic : null;
}

export function getAtlasRecommendation(input: AtlasRecommendationInput): AtlasRecommendation {
  const { memory, progress, mode } = input;
  const currentMilestone = memory.currentMilestone ?? getCurrentMilestone(memory.currentProject);
  const struggle = unresolvedStruggle(memory);
  const candidates: Candidate[] = [];
  const signals: string[] = [];

  if (memory.timeAvailableForLearning) signals.push(`Time available: ${memory.timeAvailableForLearning}`);
  if (memory.preferredDifficulty) signals.push(`Difficulty preference: ${memory.preferredDifficulty}`);
  if (memory.learningStyle) signals.push(`Learns best by: ${memory.learningStyle}`);
  if (memory.learningPace) signals.push(`Pace: ${memory.learningPace}`);
  if (struggle) signals.push(`Unresolved struggle: ${struggle}`);
  if (memory.currentGoal) signals.push(`Stated goal: ${memory.currentGoal.title}`);

  // Candidate: clear an unresolved struggle before adding new material.
  if (struggle) {
    candidates.push({
      score: 9 + difficultyWeight(memory, "light") + timeFit(memory, "15 minutes"),
      recommendedNextStep: `Clear the thing that blocked you last time: ${struggle}`,
      suggestedResource: currentMilestone?.resources[0] ?? null,
      suggestedProject: memory.currentProject,
      suggestedMilestone: currentMilestone,
      estimatedTime: "15 minutes",
      expectedOutcome: "The blocker is gone and the project moves again.",
      whyThisMatters: "Unresolved blockers compound. Clearing one restores momentum faster than new material.",
      reason: "The learner logged a struggle that was never marked resolved.",
    });
  }

  // Candidate: continue the active project milestone.
  if (currentMilestone) {
    const task = currentMilestone.tasks.find((entry) => entry.status !== "done");
    candidates.push({
      score: 8 + timeFit(memory, currentMilestone.estimatedEffort) + difficultyWeight(memory, "normal"),
      recommendedNextStep: task?.title ?? currentMilestone.title,
      suggestedResource: currentMilestone.resources[0] ?? null,
      suggestedProject: memory.currentProject,
      suggestedMilestone: currentMilestone,
      estimatedTime: currentMilestone.estimatedEffort,
      expectedOutcome: currentMilestone.description,
      whyThisMatters: "This keeps the goal tied to a finished project instead of drifting into random study.",
      reason: "The active project should drive the next mission, resource, and build step.",
    });
  }

  // Candidate: land the last mission of the current path.
  if (progress.currentLearningPath?.remainingLessons === 1) {
    candidates.push({
      score: 10 + timeFit(memory, "25 minutes"),
      recommendedNextStep: `Finish the last mission of ${progress.currentLearningPath.title}.`,
      suggestedResource: null,
      suggestedProject: null,
      suggestedMilestone: null,
      estimatedTime: "25 minutes",
      expectedOutcome: `A completed ${progress.currentLearningPath.title} foundation and a finished project.`,
      whyThisMatters: "One more finish converts five missions into something you can show someone.",
      reason: "The learner is one mission away from completing the active foundation.",
    });
  }

  // Candidate: keep an in-flight path moving.
  if (progress.currentLearningPath && (progress.currentLearningPath.remainingLessons ?? 0) > 1) {
    candidates.push({
      score: 6 + timeFit(memory, "20 minutes") + difficultyWeight(memory, "normal"),
      recommendedNextStep: `Continue ${progress.currentLearningPath.title} — next mission.`,
      suggestedResource: null,
      suggestedProject: null,
      suggestedMilestone: null,
      estimatedTime: "20 minutes",
      expectedOutcome: `Another piece of ${progress.currentLearningPath.projectName ?? "your project"} is built.`,
      whyThisMatters: "Consistency on one path beats starting a second one.",
      reason: "There is an unfinished foundation path in progress.",
    });
  }

  // Candidate: turn a finished foundation into a bigger project.
  if (progress.completedFoundationPaths.length > 0 && !currentMilestone) {
    candidates.push({
      score: 7,
      recommendedNextStep: "Choose a project that extends the foundation you just completed.",
      suggestedResource: null,
      suggestedProject: null,
      suggestedMilestone: null,
      estimatedTime: "20-30 minutes",
      expectedOutcome: "A named project with three milestones.",
      whyThisMatters: "Finished foundations become confidence when they turn into something shareable.",
      reason: "A completed foundation is the right moment to convert learning into a larger project.",
    });
  }

  // Candidate: shrink the step when motivation is the problem.
  if (mode === "motivation" || memory.learningPace === "gentle") {
    candidates.push({
      score: mode === "motivation" ? 11 : 4,
      recommendedNextStep: "Finish one tiny visible change before opening another resource.",
      suggestedResource: null,
      suggestedProject: memory.currentProject,
      suggestedMilestone: currentMilestone,
      estimatedTime: "10 minutes",
      expectedOutcome: "One visible improvement you can point to.",
      whyThisMatters: "Momentum comes back faster when the next action is small and concrete.",
      reason: "Confidence comes from evidence, and a small finished artifact creates that evidence.",
    });
  }

  // Fallback: no goal yet.
  candidates.push({
    score: 1,
    recommendedNextStep: "Pick one goal and turn it into a three-milestone project roadmap.",
    suggestedResource: null,
    suggestedProject: null,
    suggestedMilestone: null,
    estimatedTime: "15-20 minutes",
    expectedOutcome: "A clear project direction and first milestone.",
    whyThisMatters: "Atlas coaches best against a build target, not a vague topic.",
    reason: "Atlas is project-first, so goals become roadmaps before recommendations are made.",
  });

  const ranked = candidates.sort((a, b) => b.score - a.score);
  const [best, ...rest] = ranked;

  return {
    recommendedNextStep: best.recommendedNextStep,
    suggestedResource: best.suggestedResource,
    suggestedProject: best.suggestedProject,
    suggestedMilestone: best.suggestedMilestone,
    estimatedTime: best.estimatedTime,
    expectedOutcome: best.expectedOutcome,
    whyThisMatters: best.whyThisMatters,
    reason: best.reason,
    signals,
    alternatives: rest.slice(0, 2).map((candidate) => ({
      label: candidate.recommendedNextStep,
      estimatedTime: candidate.estimatedTime,
      why: candidate.whyThisMatters,
    })),
  };
}
