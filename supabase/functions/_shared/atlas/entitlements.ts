export type AtlasTier = "free" | "builder" | "professional" | "elite";

export type AtlasFeature =
  | "mentorship"
  | "memory"
  | "video_analysis"
  | "learning_continuity"
  | "research"
  | "opportunities"
  | "team_intelligence"
  | "atlas_studio";

export interface AtlasSubscriptionRecord {
  tier?: string | null;
  status?: string | null;
  current_period_end?: string | null;
}

export interface AtlasEntitlements {
  tier: AtlasTier;
  productName: "Explorer" | "Basic" | "Plus" | "Pro";
  atlasLevel: "guide" | "lite" | "smart" | "pro";
  canPersistMemory: boolean;
  entitledFeatures: readonly AtlasFeature[];
}

export interface AtlasFeatureAccess {
  allowed: boolean;
  upgrade: boolean;
  message: string;
}

const TIER_ORDER: readonly AtlasTier[] = ["free", "builder", "professional", "elite"];

const FEATURE_MINIMUM_TIER: Record<AtlasFeature, AtlasTier> = {
  mentorship: "free",
  memory: "builder",
  video_analysis: "professional",
  learning_continuity: "professional",
  research: "elite",
  opportunities: "elite",
  team_intelligence: "elite",
  atlas_studio: "elite",
};

// Only these capabilities have a real server implementation today.
const IMPLEMENTED_FEATURES = new Set<AtlasFeature>(["mentorship", "memory"]);

function normalizeTier(value: string | null | undefined): AtlasTier {
  if (value === "creator") return "professional";
  if (value === "visionary") return "elite";
  return value === "builder" || value === "professional" || value === "elite" ? value : "free";
}

function hasActiveSubscription(record: AtlasSubscriptionRecord | null | undefined, now: Date): boolean {
  if (!record || (record.status !== "active" && record.status !== "trialing")) return false;
  if (!record.current_period_end) return true;
  const endsAt = new Date(record.current_period_end);
  return !Number.isNaN(endsAt.getTime()) && endsAt > now;
}

function meetsTier(have: AtlasTier, required: AtlasTier): boolean {
  return TIER_ORDER.indexOf(have) >= TIER_ORDER.indexOf(required);
}

function productName(tier: AtlasTier): AtlasEntitlements["productName"] {
  if (tier === "builder") return "Basic";
  if (tier === "professional") return "Plus";
  if (tier === "elite") return "Pro";
  return "Explorer";
}

function atlasLevel(tier: AtlasTier): AtlasEntitlements["atlasLevel"] {
  if (tier === "builder") return "lite";
  if (tier === "professional") return "smart";
  if (tier === "elite") return "pro";
  return "guide";
}

export function resolveEffectiveAtlasTier(
  record: AtlasSubscriptionRecord | null | undefined,
  now = new Date(),
): AtlasTier {
  return hasActiveSubscription(record, now) ? normalizeTier(record?.tier) : "free";
}

export function resolveAtlasEntitlements(
  record: AtlasSubscriptionRecord | null | undefined,
  now = new Date(),
): AtlasEntitlements {
  const tier = resolveEffectiveAtlasTier(record, now);
  const entitledFeatures = (Object.keys(FEATURE_MINIMUM_TIER) as AtlasFeature[])
    .filter((feature) => meetsTier(tier, FEATURE_MINIMUM_TIER[feature]));

  return {
    tier,
    productName: productName(tier),
    atlasLevel: atlasLevel(tier),
    canPersistMemory: entitledFeatures.includes("memory"),
    entitledFeatures,
  };
}

export function authorizeAtlasFeature(
  entitlements: AtlasEntitlements,
  feature: AtlasFeature,
): AtlasFeatureAccess {
  const requiredTier = FEATURE_MINIMUM_TIER[feature];
  if (!meetsTier(entitlements.tier, requiredTier)) {
    return {
      allowed: false,
      upgrade: true,
      message: `${feature.replaceAll("_", " ")} requires the ${productName(requiredTier)} plan.`,
    };
  }

  if (!IMPLEMENTED_FEATURES.has(feature)) {
    return {
      allowed: false,
      upgrade: false,
      message: "This Atlas capability is not available yet.",
    };
  }

  return { allowed: true, upgrade: false, message: "" };
}

export function getBearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function resolveAtlasRateLimit(
  allowed: boolean | null | undefined,
  error: unknown,
): "allowed" | "exhausted" | "unavailable" {
  if (error) return "unavailable";
  return allowed === false ? "exhausted" : "allowed";
}
