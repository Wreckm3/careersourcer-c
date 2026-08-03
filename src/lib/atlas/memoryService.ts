import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Tier } from "@/lib/tiers";
import type {
  AtlasConversationMessage,
  AtlasGoal,
  AtlasMemory,
  AtlasMilestone,
  AtlasProgressSnapshot,
  AtlasProject,
} from "./types";
import { normalizeDifficultyPreference } from "./goalEngine";
import { getCurrentMilestone } from "./projectPlanner";

const STORAGE_PREFIX = "careersourcer-atlas-memory";
const RECENT_CONVERSATION_LIMIT = 16;

type AtlasMemoryRow = Tables<"atlas_memories">;
type AtlasMemoryInsert = TablesInsert<"atlas_memories">;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function createEmptyAtlasMemory(userId: string, tier: Tier, now = new Date().toISOString()): AtlasMemory {
  return {
    userId,
    learningPath: null,
    currentProject: null,
    currentGoal: null,
    projectCategory: null,
    currentMilestone: null,
    completedMilestones: [],
    completedFoundationPaths: [],
    recentConversations: [],
    strengths: [],
    weaknesses: [],
    interests: [],
    preferredLanguage: null,
    favouriteTechnologies: [],
    timeAvailableForLearning: null,
    preferredDifficulty: "starter",
    currentSubscriptionTier: tier,
    lastActiveDate: now,
    schemaVersion: 1,
  };
}

function parseJsonArray<T>(value: Json, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as unknown as T[]) : fallback;
}

function rowToMemory(row: AtlasMemoryRow, tier: Tier): AtlasMemory {
  return {
    userId: row.user_id,
    learningPath: row.learning_path,
    currentProject: row.current_project as unknown as AtlasProject | null,
    currentGoal: row.current_goal as unknown as AtlasGoal | null,
    projectCategory: row.project_category,
    currentMilestone: row.current_milestone as unknown as AtlasMilestone | null,
    completedMilestones: parseJsonArray<AtlasMilestone>(row.completed_milestones),
    completedFoundationPaths: row.completed_foundation_paths,
    recentConversations: parseJsonArray<AtlasConversationMessage>(row.recent_conversations),
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    interests: row.interests,
    preferredLanguage: row.preferred_language,
    favouriteTechnologies: row.favourite_technologies,
    timeAvailableForLearning: row.time_available_for_learning,
    preferredDifficulty: normalizeDifficultyPreference(row.preferred_difficulty),
    currentSubscriptionTier: tier,
    lastActiveDate: row.last_active_date,
    schemaVersion: 1,
  };
}

function memoryToRow(memory: AtlasMemory): AtlasMemoryInsert {
  return {
    user_id: memory.userId,
    learning_path: memory.learningPath,
    current_project: memory.currentProject as unknown as Json,
    current_goal: memory.currentGoal as unknown as Json,
    project_category: memory.projectCategory,
    current_milestone: memory.currentMilestone as unknown as Json,
    completed_milestones: memory.completedMilestones as unknown as Json,
    completed_foundation_paths: memory.completedFoundationPaths,
    recent_conversations: memory.recentConversations as unknown as Json,
    strengths: memory.strengths,
    weaknesses: memory.weaknesses,
    interests: memory.interests,
    preferred_language: memory.preferredLanguage,
    favourite_technologies: memory.favouriteTechnologies,
    time_available_for_learning: memory.timeAvailableForLearning,
    preferred_difficulty: memory.preferredDifficulty,
    current_subscription_tier: memory.currentSubscriptionTier,
    last_active_date: memory.lastActiveDate,
    schema_version: memory.schemaVersion,
  };
}

function loadLocal(userId: string, tier: Tier): AtlasMemory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AtlasMemory;
    return {
      ...createEmptyAtlasMemory(userId, tier),
      ...parsed,
      userId,
      currentSubscriptionTier: tier,
      preferredDifficulty: normalizeDifficultyPreference(parsed.preferredDifficulty),
      favouriteTechnologies: parsed.favouriteTechnologies ?? [],
      preferredLanguage: parsed.preferredLanguage ?? null,
      timeAvailableForLearning: parsed.timeAvailableForLearning ?? null,
    };
  } catch (error) {
    console.warn("Could not load local Atlas memory", error);
    return null;
  }
}

function saveLocal(memory: AtlasMemory) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(memory.userId), JSON.stringify(memory));
  } catch (error) {
    console.warn("Could not save local Atlas memory", error);
  }
}

export function syncMemoryWithProgress(
  memory: AtlasMemory,
  progress: AtlasProgressSnapshot,
  tier: Tier,
): AtlasMemory {
  const currentProject = memory.currentProject;
  const activeProjects = currentProject ? [currentProject] : [];

  return {
    ...memory,
    currentSubscriptionTier: tier,
    currentMilestone: memory.currentMilestone ?? getCurrentMilestone(currentProject),
    completedFoundationPaths: Array.from(
      new Set([...memory.completedFoundationPaths, ...progress.completedFoundationPaths]),
    ),
    completedMilestones: [...memory.completedMilestones, ...progress.completedMilestones].slice(-40),
    lastActiveDate: new Date().toISOString(),
    currentProject: activeProjects[0] ?? null,
    learningPath: progress.currentLearningPath?.branchId ?? memory.learningPath,
  };
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function matchFirst(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[.!?]$/, "");
  }
  return null;
}

const TECHNOLOGIES = [
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "HTML",
  "CSS",
  "Node",
  "Supabase",
  "Blender",
  "Figma",
  "Canva",
  "Unity",
  "Godot",
  "AI",
  "ChatGPT",
  "CapCut",
];

export function applyMemorySignalsFromInput(memory: AtlasMemory, input: string): AtlasMemory {
  const lower = input.toLowerCase();
  const preferredLanguage = matchFirst(input, [
    /\b(?:i prefer|my preferred language is|i want to learn in|teach me in)\s+([a-z+#.\s]{2,24})/i,
    /\b(?:i use|i'm using|i am using)\s+(python|javascript|typescript|react|html|css|blender|figma|canva|unity|godot)\b/i,
  ]);
  const timeAvailableForLearning = matchFirst(input, [
    /\b(?:i have|i can study|i can learn|i can practice)\s+(.{3,40}?(?:minutes?|mins?|hours?|hrs?|weekends?|after school|per day|a day|daily))/i,
    /\b((?:\d+|one|two|three)\s*(?:minutes?|mins?|hours?|hrs?)\s*(?:a day|per day|daily|each day)?)\b/i,
  ]);
  const weakness = matchFirst(input, [
    /\b(?:i struggle with|i'm struggling with|i am struggling with|i'm weak at|i am weak at|i get confused by)\s+(.{3,60})/i,
  ]);
  const strength = matchFirst(input, [
    /\b(?:i'm good at|i am good at|i'm strong at|i am strong at|i'm comfortable with|i am comfortable with)\s+(.{3,60})/i,
  ]);
  const mentionedTechnologies = TECHNOLOGIES.filter((technology) =>
    lower.includes(technology.toLowerCase()),
  );

  return {
    ...memory,
    preferredLanguage: preferredLanguage ?? memory.preferredLanguage,
    timeAvailableForLearning: timeAvailableForLearning ?? memory.timeAvailableForLearning,
    favouriteTechnologies: unique([...memory.favouriteTechnologies, ...mentionedTechnologies]).slice(0, 12),
    weaknesses: weakness ? unique([...memory.weaknesses, weakness]).slice(-12) : memory.weaknesses,
    strengths: strength ? unique([...memory.strengths, strength]).slice(-12) : memory.strengths,
    interests: unique([...memory.interests, ...mentionedTechnologies]).slice(-20),
  };
}

export interface AtlasMemoryService {
  load(userId: string, tier: Tier): Promise<AtlasMemory>;
  save(memory: AtlasMemory): Promise<void>;
  recordConversation(
    memory: AtlasMemory,
    messages: AtlasConversationMessage[],
  ): Promise<AtlasMemory>;
}

export function createAtlasMemoryService(): AtlasMemoryService {
  return {
    async load(userId, tier) {
      const fallback = loadLocal(userId, tier) ?? createEmptyAtlasMemory(userId, tier);
      const { data, error } = await supabase
        .from("atlas_memories")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Could not load Atlas memory from cloud", error);
        return fallback;
      }

      const memory = data ? rowToMemory(data, tier) : fallback;
      saveLocal(memory);
      return memory;
    },

    async save(memory) {
      saveLocal(memory);
      const { error } = await supabase
        .from("atlas_memories")
        .upsert(memoryToRow(memory), { onConflict: "user_id" });

      if (error) {
        console.warn("Could not persist Atlas memory to cloud", error);
      }
    },

    async recordConversation(memory, messages) {
      const updated: AtlasMemory = {
        ...memory,
        recentConversations: [...memory.recentConversations, ...messages].slice(-RECENT_CONVERSATION_LIMIT),
        lastActiveDate: new Date().toISOString(),
      };
      await this.save(updated);
      return updated;
    },
  };
}
