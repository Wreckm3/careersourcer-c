import type { AtlasEntryState, AtlasMemory, AtlasProgressSnapshot, AtlasStarterPrompt } from "./types";

const GOAL_PROMPTS: AtlasStarterPrompt[] = [
  {
    label: "Build a website",
    prompt: "I want to build a website. Turn that into a project roadmap and tell me the first milestone.",
    mode: "project_planning",
  },
  {
    label: "Build a game",
    prompt: "I want to build a game. Give me a beginner-sized project and the milestones to finish it.",
    mode: "project_planning",
  },
  {
    label: "Build an AI tool",
    prompt: "I want to build an AI tool. Suggest a small useful project and break it into milestones.",
    mode: "project_planning",
  },
  {
    label: "Start a business",
    prompt: "I want to start a small business. Help me choose a project I can launch this month.",
    mode: "brainstorming",
  },
  {
    label: "Find an idea",
    prompt: "Help me find a project idea that fits what I have completed so far.",
    mode: "brainstorming",
  },
];

const LESSON_PROMPTS: AtlasStarterPrompt[] = [
  {
    label: "Next step",
    prompt: "I'm stuck on this mission. What is the very next thing I should do?",
    mode: "learning",
  },
  {
    label: "Review my approach",
    prompt: "Here's how I'm approaching this mission. Review it and tell me the weakest part.",
    mode: "mentoring",
  },
  {
    label: "Choose a tool",
    prompt: "Which tool should I use for this mission, and why that one?",
    mode: "learning",
  },
  {
    label: "Connect the project",
    prompt: "How does this mission connect to the full project this track is building?",
    mode: "progress_review",
  },
];

function greetingPeriod(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function nameFragment(name?: string | null) {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `, ${first}` : "";
}

function streakFragment(streakCurrent: number) {
  if (streakCurrent <= 1) return "";
  return ` Your ${streakCurrent}-day streak says you are building some rhythm.`;
}

export function buildAtlasEntryState(
  memory: AtlasMemory,
  lessonContext?: unknown,
  progress?: AtlasProgressSnapshot,
  learnerName?: string | null,
): AtlasEntryState {
  const context = lessonContext as
    | {
        mission?: string;
        missionCompleted?: boolean;
        projectCompleted?: string | null;
        progress?: { percentBranch?: number; lessonIndex?: number; totalLessons?: number };
        nextMission?: { title: string; mission: string } | null;
      }
    | undefined;
  const greeting = `${greetingPeriod()}${nameFragment(learnerName)}.`;
  const lastLesson = progress?.lastCompletedLesson;
  const path = progress?.currentLearningPath;

  if (context?.missionCompleted && context.projectCompleted) {
    return {
      greeting: `${greeting} You finished ${context.projectCompleted}. Let's choose the next build while the momentum is fresh.`,
      subtitle: path?.title ?? "Foundation progress is now part of Atlas memory.",
      starterPrompts: GOAL_PROMPTS,
    };
  }

  if (context?.mission) {
    const percent = context.progress?.percentBranch ?? 0;
    const oneAway = path?.remainingLessons === 1 || (
      context.progress?.totalLessons != null &&
      context.progress.lessonIndex === context.progress.totalLessons
    );
    return {
      greeting: oneAway
        ? `${greeting} You're one lesson away from finishing ${path?.title ?? "this foundation"}. Let's land it cleanly.`
        : `${greeting} You're about ${percent}% through ${path?.title ?? "this foundation"}.${streakFragment(progress?.streakCurrent ?? 0)} Today we keep the build step clear.`,
      subtitle: context.mission,
      starterPrompts: LESSON_PROMPTS,
    };
  }

  if (memory.currentProject && memory.currentMilestone) {
    return {
      greeting: `${greeting} Your ${memory.currentProject.title} project is waiting at ${memory.currentMilestone.title}.`,
      subtitle: memory.currentProject.title,
      starterPrompts: LESSON_PROMPTS,
    };
  }

  if (path && lastLesson) {
    return {
      greeting: path.remainingLessons === 1
        ? `${greeting} Last time you finished ${lastLesson.title}. You're one lesson away from finishing ${path.title}.`
        : `${greeting} Last time you finished ${lastLesson.title}. Today we keep building toward ${path.projectName ?? path.title}.`,
      subtitle: path.projectName ?? `${path.lessonsCompleted}/${path.totalLessons} lessons complete`,
      starterPrompts: LESSON_PROMPTS,
    };
  }

  if (memory.completedFoundationPaths.length > 0) {
    return {
      greeting: `${greeting} You've completed a foundation. Let's choose the project that comes next.`,
      subtitle: "Atlas will keep the project, milestones, and next step together.",
      starterPrompts: GOAL_PROMPTS,
    };
  }

  return {
    greeting: `${greeting} Pick what you want to build first.`,
    subtitle: "Pick a goal and Atlas will turn it into a project roadmap.",
    starterPrompts: GOAL_PROMPTS,
  };
}
