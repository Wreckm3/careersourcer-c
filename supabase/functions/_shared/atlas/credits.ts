export type AtlasProcessingLevel = "auto" | "instant" | "think" | "deep";

export interface AtlasRoutingContext {
  tier: "free" | "builder" | "professional" | "elite";
  availableCredits: number;
  essentialMode: boolean;
  feature: string;
  messageCharacters: number;
  processingLevel?: AtlasProcessingLevel;
}

export interface AtlasRoutingResult {
  level: AtlasProcessingLevel;
  maxOutputTokens: number;
  worstCaseCredits: number;
  worstCaseBudgetMicroKes: bigint;
  essentialMode: boolean;
  reason: string;
}

const LEVEL_COSTS: Record<AtlasProcessingLevel, { credits: number; tokens: number }> = {
  auto: { credits: 2, tokens: 700 },
  instant: { credits: 1, tokens: 400 },
  think: { credits: 8, tokens: 1400 },
  deep: { credits: 20, tokens: 2800 },
};

export function routeAtlasRequest(context: AtlasRoutingContext): AtlasRoutingResult {
  const essentialMode = context.essentialMode || context.availableCredits <= 20;
  const requested = context.processingLevel ?? "auto";
  let level = requested;

  if (essentialMode) level = context.messageCharacters > 2400 ? "instant" : "instant";
  if (level === "deep" && context.tier !== "elite") level = "think";
  if (level === "think" && context.tier === "free") level = "instant";

  const cost = LEVEL_COSTS[level];
  if (cost.credits > context.availableCredits) {
    level = "instant";
  }
  const finalCost = LEVEL_COSTS[level];
  if (finalCost.credits > context.availableCredits) {
    throw new Error("Atlas credits unavailable");
  }

  return {
    level,
    maxOutputTokens: finalCost.tokens,
    worstCaseCredits: finalCost.credits,
    worstCaseBudgetMicroKes: BigInt(finalCost.tokens) * 250n,
    essentialMode,
    reason: essentialMode ? "Essential Mentorship Mode" : "Standard mode",
  };
}

export function estimateAtlasInputTokens(messages: readonly { content: string }[], lessonContext: unknown): number {
  const messageCharacters = messages.reduce((sum, message) => sum + message.content.length, 0);
  const lessonCharacters = lessonContext == null ? 0 : JSON.stringify(lessonContext).length;
  return Math.ceil((messageCharacters + lessonCharacters) / 4);
}
