import type { Category, Difficulty, LessonResource } from "@/data/curriculum/types";
import type { Tier } from "@/lib/tiers";

export type AtlasConversationMode =
  | "learning"
  | "mentoring"
  | "brainstorming"
  | "project_planning"
  | "progress_review"
  | "motivation"
  | "general_help";

export type AtlasGoalId =
  | "build_website"
  | "build_game"
  | "build_ai_tool"
  | "start_business"
  | "improve_portfolio"
  | "learn_blender"
  | "learn_animation";

export type AtlasMilestoneStatus = "not_started" | "in_progress" | "blocked" | "completed";
export type AtlasTaskStatus = "todo" | "doing" | "done";
export type AtlasDifficultyPreference = "starter" | "builder" | "advanced";

export interface AtlasConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AtlasTask {
  id: string;
  title: string;
  description?: string;
  status: AtlasTaskStatus;
  resourceIds: string[];
}

export interface AtlasProjectResource extends LessonResource {
  id: string;
  type: "lesson" | "tool" | "article" | "video" | "template";
}

export interface AtlasMilestone {
  id: string;
  title: string;
  description: string;
  estimatedEffort: string;
  status: AtlasMilestoneStatus;
  dependencies: string[];
  completionPercentage: number;
  tasks: AtlasTask[];
  resources: AtlasProjectResource[];
}

export interface AtlasProject {
  id: string;
  title: string;
  categoryId?: string;
  branchId?: string;
  goalId?: AtlasGoalId;
  description: string;
  milestones: AtlasMilestone[];
  status: AtlasMilestoneStatus;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface AtlasGoal {
  id: AtlasGoalId;
  title: string;
  description: string;
  projectPrompt: string;
  defaultDifficulty: AtlasDifficultyPreference;
  supportedCategories: Category["id"][];
}

export type AtlasLearningPace = "gentle" | "steady" | "intense";
export type AtlasLearningStyle = "watch" | "read" | "build" | "discuss";

/** A thing the learner got stuck on, kept so Atlas can revisit it later. */
export interface AtlasStruggle {
  topic: string;
  noticedAt: string;
  resolved: boolean;
}

export interface AtlasMemory {
  userId: string;
  learningPath: string | null;
  currentProject: AtlasProject | null;
  currentGoal: AtlasGoal | null;
  projectCategory: string | null;
  currentMilestone: AtlasMilestone | null;
  completedMilestones: AtlasMilestone[];
  completedFoundationPaths: string[];
  recentConversations: AtlasConversationMessage[];
  /** Verbatim recent questions — feeds the recommendation engine. */
  recentQuestions: string[];
  strengths: string[];
  weaknesses: string[];
  struggleLog: AtlasStruggle[];
  interests: string[];
  preferredLanguage: string | null;
  favouriteTechnologies: string[];
  timeAvailableForLearning: string | null;
  preferredDifficulty: AtlasDifficultyPreference;
  learningPace: AtlasLearningPace | null;
  learningStyle: AtlasLearningStyle | null;
  lastCelebratedMilestone: string | null;
  currentSubscriptionTier: Tier;
  lastActiveDate: string;
  schemaVersion: 1;
}

export interface AtlasLessonSummary {
  id: string;
  title: string;
  mission: string;
  outcome: string;
  branchId: string;
  branchTitle: string;
  categoryId: string;
  categoryTitle: string;
}

export interface AtlasLearningPathSummary {
  branchId: string;
  title: string;
  categoryTitle: string;
  projectName: string | null;
  lessonsCompleted: number;
  totalLessons: number;
  remainingLessons: number;
}

export interface AtlasProgressSnapshot {
  completedFoundationPaths: string[];
  completedProjects: AtlasProject[];
  completedMilestones: AtlasMilestone[];
  activeGoals: AtlasGoal[];
  activeProjects: AtlasProject[];
  completedLessons: string[];
  lastCompletedLesson: AtlasLessonSummary | null;
  currentLearningPath: AtlasLearningPathSummary | null;
  streakCurrent: number;
}

export interface AtlasRecommendationInput {
  mode: AtlasConversationMode;
  memory: AtlasMemory;
  progress: AtlasProgressSnapshot;
  lessonContext?: unknown;
}

export interface AtlasRecommendation {
  recommendedNextStep: string;
  suggestedResource: AtlasProjectResource | null;
  suggestedProject: AtlasProject | null;
  suggestedMilestone: AtlasMilestone | null;
  estimatedTime: string;
  expectedOutcome: string;
  whyThisMatters: string;
  reason: string;
}

export interface AtlasSubscriptionCapabilities {
  tier: Tier;
  productName: "Explorer" | "Builder" | "Creator" | "Founder";
  atlasLevel: "none" | "lite" | "smart" | "pro";
  canUseAtlas: boolean;
  canPersistProjectMemory: boolean;
  canPersistRoadmaps: boolean;
  canTrackMilestones: boolean;
  enabledModes: AtlasConversationMode[];
  futureCapabilities: string[];
}

export interface AtlasPersonalityConfig {
  identity: string;
  coreValues: string[];
  speakingStyle: string[];
  greetingStyle: string[];
  encouragementStyle: string[];
  reflectionStyle: string[];
  projectCoachingStyle: string[];
  procrastinationStyle: string[];
  humourStyle: string[];
  neverDo: string[];
}

export interface AtlasStarterPrompt {
  label: string;
  prompt: string;
  mode: AtlasConversationMode;
}

export interface AtlasEntryState {
  greeting: string;
  subtitle: string;
  starterPrompts: AtlasStarterPrompt[];
}

export interface AtlasControllerContext {
  userId: string;
  learnerName?: string | null;
  tier: Tier;
  selectedPath?: string | null;
  completedSessions: string[];
  streakCurrent: number;
  lessonContext?: unknown;
}

export interface AtlasTurnPlan {
  mode: AtlasConversationMode;
  messages: AtlasConversationMessage[];
  memory: AtlasMemory;
  progress: AtlasProgressSnapshot;
  recommendation: AtlasRecommendation;
  request: {
    messages: AtlasConversationMessage[];
    lessonContext: unknown | null;
    learnerProfile: unknown;
    atlasContext: {
      mode: AtlasConversationMode;
      memory: AtlasMemory;
      progress: AtlasProgressSnapshot;
      recommendation: AtlasRecommendation;
      capabilities: AtlasSubscriptionCapabilities;
      personality: AtlasPersonalityConfig;
      mentorBrief: {
        learnerName: string | null;
        currentPosition: string;
        responseFormat: string[];
        lessonContext: unknown | null;
      };
    };
  };
}

export const DIFFICULTY_TO_PREFERENCE: Record<Difficulty, AtlasDifficultyPreference> = {
  Starter: "starter",
  Builder: "builder",
  Advanced: "advanced",
};
