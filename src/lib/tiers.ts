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
    name: "Builder",
    tagline: "Focused practice with Atlas Lite.",
    priceKes: 99,
    priceDisplay: "KSh 99 / month",
    atlasLevel: "lite",
    ctaLabel: "Go Builder",
    features: [
      "Everything in Explorer",
      "Atlas Lite mentor",
      "Focus Mode",
      "Personalized suggestions",
      "Tool recommendations",
      "Next-mission guidance",
    ],
  },
  professional: {
    id: "professional",
    name: "Professional",
    tagline: "Turn your work into credible career evidence.",
    priceKes: 299,
    priceDisplay: "KSh 299 / month",
    atlasLevel: "smart",
    highlight: true,
    ctaLabel: "Go Professional",
    features: [
      "Everything in Builder",
      "Atlas Career Coach",
      "Portfolio and CV guidance",
      "Skill-gap and project analysis",
      "Interview and opportunity preparation",
    ],
  },
  elite: {
    id: "elite",
    name: "Elite",
    tagline: "Advanced, branch-aware strategic guidance.",
    priceKes: 499,
    priceDisplay: "KSh 499 / month",
    atlasLevel: "pro",
    ctaLabel: "Go Elite",
    features: [
      "Everything in Professional",
      "Atlas Strategic Advisor",
      "Branch-aware production coaching",
      "Advanced portfolio strategy",
      "Long-term accountability",
      "Multi-path planning",
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
