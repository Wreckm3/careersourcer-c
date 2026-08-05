import type {
  AtlasCoachingSignals,
  AtlasMemory,
  AtlasMentorBrief,
  AtlasProgressSnapshot,
  AtlasRecommendation,
} from "./types";

/**
 * The mentor brief is the difference between a chatbot and Atlas.
 *
 * It is computed deterministically from memory + progress BEFORE the model is
 * called, so Atlas always opens from a known position ("yesterday you finished
 * X, today we add Y") instead of asking the learner what they want.
 */

function timeOfDay(date = new Date()): AtlasMentorBrief["timeOfDay"] {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function daysBetween(iso: string | null | undefined, now = new Date()) {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

export function buildCoachingSignals(
  memory: AtlasMemory,
  progress: AtlasProgressSnapshot,
): AtlasCoachingSignals {
  const daysSinceLastSession = daysBetween(memory.lastActiveDate);
  const lastMilestone = memory.completedMilestones[memory.completedMilestones.length - 1]?.title ?? null;
  const lastLesson = progress.lastCompletedLesson?.title ?? null;
  const celebrationSubject = lastMilestone ?? lastLesson;

  return {
    daysSinceLastSession,
    shouldCelebrate: Boolean(
      celebrationSubject && celebrationSubject !== memory.lastCelebratedMilestone,
    ),
    celebrationSubject,
    shouldChallengeProcrastination: daysSinceLastSession >= 3,
    unresolvedStruggles: memory.struggleLog
      .filter((struggle) => !struggle.resolved)
      .slice(-4)
      .map((struggle) => struggle.topic),
    streakCurrent: progress.streakCurrent,
  };
}

function isNextStepQuestion(input: string) {
  const text = input.toLowerCase().trim();
  return (
    text === "what next" ||
    text === "what's next" ||
    text.includes("what next") ||
    text.includes("what should i do next") ||
    text.includes("next best action")
  );
}

function responseFormatFor(input: string): string[] {
  if (isNextStepQuestion(input)) {
    return ["Current Position", "Next Best Action", "Estimated Time", "Expected Outcome", "Why This Matters"];
  }
  return [
    "Answer the actual question first, plainly.",
    "Explain why it matters for the project being built.",
    "End with one specific next action and how long it takes.",
  ];
}

export function describeCurrentPosition(
  memory: AtlasMemory,
  progress: AtlasProgressSnapshot,
): string {
  if (memory.currentProject && memory.currentMilestone) {
    return `${memory.currentProject.title}: ${memory.currentMilestone.title}`;
  }
  if (progress.currentLearningPath) {
    const path = progress.currentLearningPath;
    return `${path.title}: ${path.lessonsCompleted}/${path.totalLessons} missions complete`;
  }
  if (progress.lastCompletedLesson) {
    return `Last completed: ${progress.lastCompletedLesson.title}`;
  }
  return "No active project yet";
}

export function buildMentorBrief(args: {
  memory: AtlasMemory;
  progress: AtlasProgressSnapshot;
  recommendation: AtlasRecommendation;
  input: string;
  learnerName?: string | null;
  lessonContext?: unknown;
}): AtlasMentorBrief {
  const { memory, progress, recommendation, input, learnerName, lessonContext } = args;
  const signals = buildCoachingSignals(memory, progress);

  return {
    learnerName: learnerName?.trim().split(/\s+/)[0] ?? null,
    timeOfDay: timeOfDay(),
    currentPosition: describeCurrentPosition(memory, progress),
    lastAchievement: signals.celebrationSubject,
    todaysFocus: recommendation.recommendedNextStep,
    estimatedTime: recommendation.estimatedTime,
    afterThisYouWill: recommendation.expectedOutcome,
    responseFormat: responseFormatFor(input),
    coachingSignals: signals,
    lessonContext: lessonContext ?? null,
  };
}
