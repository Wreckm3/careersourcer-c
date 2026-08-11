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

const EXPLORER_MODES: AtlasConversationMode[] = ["learning", "general_help", "brainstorming"];

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

  if (tier === "professional") {
    return {
      tier,
      productName: "Professional",
      atlasLevel: "smart",
      canUseAtlas: true,
      canPersistProjectMemory: true,
      canPersistRoadmaps: true,
      canTrackMilestones: true,
      enabledModes: BUILDER_MODES,
      futureCapabilities: ["project_reviews", "portfolio_feedback", "career_gap_analysis"],
    };
  }

  if (tier === "elite") {
    return {
      tier,
      productName: "Elite",
      atlasLevel: "pro",
      canUseAtlas: true,
      canPersistProjectMemory: true,
      canPersistRoadmaps: true,
      canTrackMilestones: true,
      enabledModes: BUILDER_MODES,
      futureCapabilities: ["long_term_accountability", "branch_strategy", "opportunity_analysis"],
    };
  }

  return {
    tier,
    productName: "Explorer",
    atlasLevel: "guide",
    canUseAtlas: true,
    canPersistProjectMemory: false,
    canPersistRoadmaps: false,
    canTrackMilestones: false,
    enabledModes: EXPLORER_MODES,
    futureCapabilities: [],
  };
}

