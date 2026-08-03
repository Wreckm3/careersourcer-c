import type { AtlasDifficultyPreference, AtlasGoal, AtlasGoalId } from "./types";

export const atlasGoals: Record<AtlasGoalId, AtlasGoal> = {
  build_website: {
    id: "build_website",
    title: "Build a Website",
    description: "Ship a useful, publishable website with clear pages and responsive polish.",
    projectPrompt: "Build a personal or small-business website that can be shared publicly.",
    defaultDifficulty: "starter",
    supportedCategories: ["technology", "business", "creative"],
  },
  build_game: {
    id: "build_game",
    title: "Build a Game",
    description: "Create a small playable game with a clear loop and a finished screen.",
    projectPrompt: "Build a tiny game that proves one fun mechanic.",
    defaultDifficulty: "starter",
    supportedCategories: ["technology", "creative"],
  },
  build_ai_tool: {
    id: "build_ai_tool",
    title: "Build an AI Tool",
    description: "Create a lightweight AI-powered helper around one repeatable workflow.",
    projectPrompt: "Build a simple AI helper for a task you already understand.",
    defaultDifficulty: "builder",
    supportedCategories: ["technology", "business"],
  },
  start_business: {
    id: "start_business",
    title: "Start a Business",
    description: "Validate an offer, build the first asset, and make a first outreach plan.",
    projectPrompt: "Launch a tiny service or product with one clear buyer.",
    defaultDifficulty: "starter",
    supportedCategories: ["business", "creative", "technology"],
  },
  improve_portfolio: {
    id: "improve_portfolio",
    title: "Improve my Portfolio",
    description: "Turn completed work into proof a real person can understand and trust.",
    projectPrompt: "Package your strongest work into a portfolio case study.",
    defaultDifficulty: "starter",
    supportedCategories: ["technology", "creative", "business"],
  },
  learn_blender: {
    id: "learn_blender",
    title: "Learn Blender",
    description: "Make a small 3D scene while learning the essential modeling workflow.",
    projectPrompt: "Build a simple 3D scene with lighting, materials, and one finished render.",
    defaultDifficulty: "starter",
    supportedCategories: ["creative"],
  },
  learn_animation: {
    id: "learn_animation",
    title: "Learn Animation",
    description: "Create a short motion piece with timing, structure, and export settings.",
    projectPrompt: "Build a short animation that communicates one clear idea.",
    defaultDifficulty: "starter",
    supportedCategories: ["creative"],
  },
};

export function getAtlasGoal(goalId: AtlasGoalId): AtlasGoal {
  return atlasGoals[goalId];
}

export function inferGoalFromPrompt(prompt: string): AtlasGoal | null {
  const text = prompt.toLowerCase();
  if (text.includes("website") || text.includes("landing page") || text.includes("web development") || text.includes("frontend")) {
    return atlasGoals.build_website;
  }
  if (text.includes("game") || text.includes("game developer") || text.includes("unity") || text.includes("godot")) {
    return atlasGoals.build_game;
  }
  if (text.includes("ai") || text.includes("automation") || text.includes("chatbot") || text.includes("machine learning")) {
    return atlasGoals.build_ai_tool;
  }
  if (text.includes("business") || text.includes("sell") || text.includes("startup") || text.includes("freelance")) {
    return atlasGoals.start_business;
  }
  if (text.includes("portfolio")) return atlasGoals.improve_portfolio;
  if (text.includes("blender") || text.includes("3d")) return atlasGoals.learn_blender;
  if (text.includes("animation") || text.includes("animate")) return atlasGoals.learn_animation;
  return null;
}

export function normalizeDifficultyPreference(value?: string | null): AtlasDifficultyPreference {
  if (value === "builder" || value === "advanced") return value;
  return "starter";
}
