import type { AtlasGoal, AtlasMilestone, AtlasProject } from "./types";

function milestone(
  id: string,
  title: string,
  description: string,
  estimatedEffort: string,
  dependencies: string[] = [],
): AtlasMilestone {
  return {
    id,
    title,
    description,
    estimatedEffort,
    status: dependencies.length ? "not_started" : "in_progress",
    dependencies,
    completionPercentage: 0,
    tasks: [
      {
        id: `${id}-scope`,
        title: "Define the smallest finished version",
        status: dependencies.length ? "todo" : "doing",
        resourceIds: [],
      },
      {
        id: `${id}-build`,
        title: "Build the core artifact",
        status: "todo",
        resourceIds: [],
      },
      {
        id: `${id}-reflect`,
        title: "Write one improvement note",
        status: "todo",
        resourceIds: [],
      },
    ],
    resources: [],
  };
}

export function createProjectRoadmap(goal: AtlasGoal, now = new Date().toISOString()): AtlasProject {
  const projectId = `${goal.id}-${now.slice(0, 10)}`;
  const milestones = [
    milestone(
      `${projectId}-01`,
      "Choose the project promise",
      `Turn "${goal.projectPrompt}" into one concrete project with a clear finish line.`,
      "30-45 minutes",
    ),
    milestone(
      `${projectId}-02`,
      "Build the first usable version",
      "Create the smallest working artifact before adding polish or extra ideas.",
      "1-2 focused sessions",
      [`${projectId}-01`],
    ),
    milestone(
      `${projectId}-03`,
      "Add portfolio-ready proof",
      "Capture what you built, what changed, and what you would improve next.",
      "45-60 minutes",
      [`${projectId}-02`],
    ),
  ];

  return {
    id: projectId,
    title: goal.projectPrompt,
    goalId: goal.id,
    description: goal.description,
    milestones,
    status: "in_progress",
    completionPercentage: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function getCurrentMilestone(project: AtlasProject | null): AtlasMilestone | null {
  if (!project) return null;
  return (
    project.milestones.find((m) => m.status === "in_progress" || m.status === "blocked") ??
    project.milestones.find((m) => m.status === "not_started") ??
    null
  );
}

export function applyMilestoneCompletion(project: AtlasProject, milestoneId: string): AtlasProject {
  const milestones = project.milestones.map((milestone) =>
    milestone.id === milestoneId
      ? { ...milestone, status: "completed" as const, completionPercentage: 100 }
      : milestone,
  );
  const completed = milestones.filter((milestone) => milestone.status === "completed").length;

  return {
    ...project,
    milestones,
    completionPercentage: Math.round((completed / milestones.length) * 100),
    status: completed === milestones.length ? "completed" : "in_progress",
    updatedAt: new Date().toISOString(),
  };
}

