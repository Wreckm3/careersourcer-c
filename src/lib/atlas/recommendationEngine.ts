import type { AtlasRecommendation, AtlasRecommendationInput } from "./types";
import { getCurrentMilestone } from "./projectPlanner";

export function getAtlasRecommendation(input: AtlasRecommendationInput): AtlasRecommendation {
  const currentMilestone = input.memory.currentMilestone ?? getCurrentMilestone(input.memory.currentProject);

  if (currentMilestone) {
    const taskTitle = currentMilestone.tasks.find((task) => task.status !== "done")?.title ?? currentMilestone.title;
    return {
      recommendedNextStep: taskTitle,
      suggestedResource: currentMilestone.resources[0] ?? null,
      suggestedProject: input.memory.currentProject,
      suggestedMilestone: currentMilestone,
      estimatedTime: currentMilestone.estimatedEffort,
      expectedOutcome: currentMilestone.description,
      whyThisMatters: "This keeps the goal tied to a finished project instead of drifting into random study.",
      reason: "The active project should drive the next lesson, resource, and build step.",
    };
  }

  if (input.progress.currentLearningPath?.remainingLessons === 1) {
    return {
      recommendedNextStep: "Finish the final foundation lesson.",
      suggestedResource: null,
      suggestedProject: null,
      suggestedMilestone: null,
      estimatedTime: "One focused session",
      expectedOutcome: `A completed ${input.progress.currentLearningPath.title} foundation.`,
      whyThisMatters: "One more finish gives Atlas a stronger project base for the next roadmap.",
      reason: "The learner is one lesson away from finishing the active foundation.",
    };
  }

  if (input.progress.completedFoundationPaths.length > 0) {
    return {
      recommendedNextStep: "Choose a small project that extends the foundation you just completed.",
      suggestedResource: null,
      suggestedProject: null,
      suggestedMilestone: null,
      estimatedTime: "20-30 minutes",
      expectedOutcome: "A named project with three milestones.",
      whyThisMatters: "Finished foundations become confidence when they turn into something shareable.",
      reason: "A completed foundation is the right moment to convert learning into a larger project.",
    };
  }

  if (input.mode === "motivation") {
    return {
      recommendedNextStep: "Finish one tiny visible change before opening another resource.",
      suggestedResource: null,
      suggestedProject: null,
      suggestedMilestone: null,
      estimatedTime: "10-15 minutes",
      expectedOutcome: "One visible improvement you can point to.",
      whyThisMatters: "Momentum comes back faster when the next action is small and concrete.",
      reason: "Confidence comes from evidence, and a small finished artifact creates that evidence.",
    };
  }

  return {
    recommendedNextStep: "Pick one goal and turn it into a three-milestone project roadmap.",
    suggestedResource: null,
    suggestedProject: null,
    suggestedMilestone: null,
    estimatedTime: "15-20 minutes",
    expectedOutcome: "A clear project direction and first milestone.",
    whyThisMatters: "Atlas learns best from a build target, not a vague topic.",
    reason: "Atlas is project-first, so goals become roadmaps before recommendations are made.",
  };
}
