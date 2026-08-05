import type { Category } from "@/data/curriculum/types";
import { buildAtlasLearnerProfile } from "./lessonContext";
import { atlasPersonality } from "./personality";
import { buildAtlasEntryState } from "./greetingService";
import { inferGoalFromPrompt } from "./goalEngine";
import type {
  AtlasControllerContext,
  AtlasConversationMessage,
  AtlasConversationMode,
  AtlasEntryState,
  AtlasMemory,
  AtlasTurnPlan,
} from "./types";
import type { AtlasMemoryService } from "./memoryService";
import {
  applyMemorySignalsFromInput,
  markMilestoneCelebrated,
  syncMemoryWithProgress,
} from "./memoryService";
import { buildMentorBrief } from "./mentorBrief";
import { createProjectRoadmap, getCurrentMilestone } from "./projectPlanner";
import { buildAtlasProgressSnapshot } from "./progressService";
import { getAtlasRecommendation } from "./recommendationEngine";
import { getAtlasSubscriptionCapabilities } from "./subscriptionCapabilities";

export interface AtlasConversationController {
  getEntryState(context: AtlasControllerContext): Promise<AtlasEntryState>;
  prepareTurn(
    context: AtlasControllerContext,
    history: AtlasConversationMessage[],
    input: string,
  ): Promise<AtlasTurnPlan>;
  recordAssistantReply(plan: AtlasTurnPlan, content: string): Promise<void>;
}

export interface AtlasConversationControllerDeps {
  categories: Category[];
  memoryService: AtlasMemoryService;
}

function determineConversationMode(input: string, lessonContext?: unknown): AtlasConversationMode {
  const text = input.toLowerCase();
  if (text.includes("roadmap") || text.includes("milestone") || text.includes("project plan")) return "project_planning";
  if (text.includes("idea") || text.includes("brainstorm")) return "brainstorming";
  if (text.includes("progress") || text.includes("completed") || text.includes("review")) return "progress_review";
  if (text.includes("motivation") || text.includes("confidence") || text.includes("overwhelmed")) return "motivation";
  if (text.includes("mentor") || text.includes("feedback")) return "mentoring";
  if (text.includes("stuck") || text.includes("lesson") || text.includes("what next") || lessonContext) return "learning";
  return "general_help";
}

function applyGoalFromInput(memory: AtlasMemory, input: string): AtlasMemory {
  const goal = inferGoalFromPrompt(input);
  if (!goal || memory.currentGoal?.id === goal.id) return memory;

  const project = createProjectRoadmap(goal);
  return {
    ...memory,
    currentGoal: goal,
    currentProject: project,
    projectCategory: goal.supportedCategories[0] ?? null,
    currentMilestone: getCurrentMilestone(project),
    interests: Array.from(new Set([...memory.interests, goal.title])),
  };
}

function isProcrastinationSignal(input: string) {
  const text = input.toLowerCase();
  return /\b(later|tomorrow|can'?t be bothered|no time|lazy|gave up|quit|too hard)\b/.test(text);
}


export function createAtlasConversationController({
  categories,
  memoryService,
}: AtlasConversationControllerDeps): AtlasConversationController {
  async function loadContext(context: AtlasControllerContext) {
    const progress = buildAtlasProgressSnapshot(
      categories,
      context.completedSessions,
      context.streakCurrent,
      context.selectedPath,
    );
    const loadedMemory = await memoryService.load(context.userId, context.tier);
    const memory = syncMemoryWithProgress(loadedMemory, progress, context.tier);
    return { memory, progress };
  }

  return {
    async getEntryState(context) {
      const { memory, progress } = await loadContext(context);
      return buildAtlasEntryState(memory, context.lessonContext, progress, context.learnerName);
    },

    async prepareTurn(context, history, input) {
      const { progress, memory: loadedMemory } = await loadContext(context);
      const mode = determineConversationMode(input, context.lessonContext);
      const memory = applyMemorySignalsFromInput(applyGoalFromInput(loadedMemory, input), input);
      const capabilities = getAtlasSubscriptionCapabilities(context.tier);
      const progressWithActiveState = {
        ...progress,
        activeGoals: memory.currentGoal ? [memory.currentGoal] : [],
        activeProjects: memory.currentProject ? [memory.currentProject] : [],
      };
      const recommendation = getAtlasRecommendation({
        mode,
        memory,
        progress: progressWithActiveState,
        lessonContext: context.lessonContext,
      });
      const messages = [...history, { role: "user" as const, content: input }];

      const memoryWithUserTurn = await memoryService.recordConversation(memory, [{ role: "user", content: input }]);

      const mentorBrief = buildMentorBrief({
        memory: memoryWithUserTurn,
        progress: progressWithActiveState,
        recommendation,
        input,
        learnerName: context.learnerName,
        lessonContext: context.lessonContext,
      });
      if (isProcrastinationSignal(input)) {
        mentorBrief.coachingSignals.shouldChallengeProcrastination = true;
      }

      return {
        mode,
        messages,
        memory: memoryWithUserTurn,
        progress: progressWithActiveState,
        recommendation,
        request: {
          messages,
          lessonContext: context.lessonContext ?? null,
          learnerProfile: buildAtlasLearnerProfile(
            categories,
            context.completedSessions,
            context.streakCurrent,
            memory.currentGoal ? [memory.currentGoal.title] : [],
          ),
          atlasContext: {
            mode,
            memory: memoryWithUserTurn,
            progress: progressWithActiveState,
            recommendation,
            capabilities,
            personality: atlasPersonality,
            mentorBrief,
          },
        },
      };
    },

    async recordAssistantReply(plan, content) {
      if (!content.trim()) return;
      const celebrated = markMilestoneCelebrated(
        plan.memory,
        plan.request.atlasContext.mentorBrief.coachingSignals.celebrationSubject,
      );
      await memoryService.recordConversation(celebrated, [{ role: "assistant", content }]);
    },
  };
}
