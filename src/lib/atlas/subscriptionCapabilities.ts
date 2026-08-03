import type { Tier } from "@/lib/tiers";
import type { AtlasConversationMode, AtlasSubscriptionCapabilities } from "./types";

const BUILDER_MODES: AtlasConversationMode[] = [
  "learning",
  "mentoring",
  "brainstorming",
  "project_planning",
  "progress_review",
  "motivation",
  "general_help",
];

const EXPLORER_MODES: AtlasConversationMode[] = ["general_help"];

export function getAtlasSubscriptionCapabilities(tier: Tier): AtlasSubscriptionCapabilities {
  if (tier === "builder") {
    return {
      tier,
      productName: "Builder",
      atlasLevel: "lite",
      canUseAtlas: true,
      canPersistProjectMemory: true,
      canPersistRoadmaps: true,
      canTrackMilestones: true,
      enabledModes: BUILDER_MODES,
      futureCapabilities: ["project_reviews", "portfolio_feedback", "multi_project_memory"],
    };
  }

  if (tier === "creator") {
    return {
      tier,
      productName: "Creator",
      atlasLevel: "smart",
      canUseAtlas: true,
      canPersistProjectMemory: true,
      canPersistRoadmaps: true,
      canTrackMilestones: true,
      enabledModes: BUILDER_MODES,
      futureCapabilities: ["project_reviews", "portfolio_feedback", "idea_extraction"],
    };
  }

  if (tier === "visionary") {
    return {
      tier,
      productName: "Founder",
      atlasLevel: "pro",
      canUseAtlas: true,
      canPersistProjectMemory: true,
      canPersistRoadmaps: true,
      canTrackMilestones: true,
      enabledModes: BUILDER_MODES,
      futureCapabilities: ["long_term_accountability", "startup_guidance", "income_roadmaps"],
    };
  }

  return {
    tier,
    productName: "Explorer",
    atlasLevel: "none",
    canUseAtlas: false,
    canPersistProjectMemory: false,
    canPersistRoadmaps: false,
    canTrackMilestones: false,
    enabledModes: EXPLORER_MODES,
    futureCapabilities: [],
  };
}

