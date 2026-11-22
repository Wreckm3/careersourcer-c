/**
 * Subscription tiers — single source of truth.
 *
 * Tier order defines access: any tier includes benefits of tiers below it.
 * Prices are display-only; real amounts live server-side when checkout ships.
 */

export type Tier = "free" | "builder" | "professional" | "elite";

export const TIER_ORDER: Tier[] = ["free", "builder", "professional", "elite"];

export interface TierPlan {
  id: Tier;
  name: string;
  tagline: string;
  priceKes: number;         // 0 for free
  priceDisplay: string;
  atlasLevel: "guide" | "lite" | "smart" | "pro";
  features: string[];
  ctaLabel: string;
  highlight?: boolean;
}

export const PLANS: Record<Tier, TierPlan> = {
  free: {
    id: "free",
    name: "Explorer",
    tagline: "Start building today, no card required.",
    priceKes: 0,
    priceDisplay: "Free",
    atlasLevel: "guide",
    ctaLabel: "Start free",
    features: [
      "Project-first learning paths",
      "Builder tips throughout lessons",
      "Free curated video library",
      "Progress and streak tracking",
    ],
  },
  builder: {
    id: "builder",
    name: "Basic",
    tagline: "Essential personal mentorship with Atlas.",
    priceKes: 99,
    priceDisplay: "KSh 99 / month",
    atlasLevel: "lite",
    ctaLabel: "Go Basic",
    features: [
      "Everything in Explorer",
      "Practical Atlas mentorship",
      "Focus Mode",
      "Personalized learning priorities",
      "Beginner roadmaps and milestone planning",
      "Persistent Atlas project memory",
    ],
  },
  professional: {
    id: "professional",
    name: "Plus",
    tagline: "Advanced learning and project mentorship.",
    priceKes: 299,
    priceDisplay: "KSh 299 / month",
    atlasLevel: "smart",
    highlight: true,
    ctaLabel: "Go Plus",
    features: [
      "Everything in Basic",
      "Expanded project and learning context",
      "Detailed project feedback",
      "Skill-gap guidance",
      "Learning-continuity architecture as supported",
    ],
  },
  elite: {
    id: "elite",
    name: "Pro",
    tagline: "Career and collaboration strategy when supported.",
    priceKes: 499,
    priceDisplay: "KSh 499 / month",
    atlasLevel: "pro",
    ctaLabel: "Go Pro",
    features: [
      "Everything in Plus",
      "Advanced Atlas context allowance",
      "Career and collaboration strategy",
      "Project portfolio planning",
      "Future opportunities and team intelligence when available",
    ],
  },
};

export const rank = (t: Tier) => TIER_ORDER.indexOf(t);

/** Does `have` cover the required tier? */
export const meetsTier = (have: Tier, required: Tier) => rank(have) >= rank(required);

/** Nice label for the next tier up (used in upgrade CTAs). */
export const nextTier = (t: Tier): Tier | null => {
  const i = rank(t);
  return i >= 0 && i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : null;
};
