import type { Tier } from "../tiers";

/**
 * A request identity binds an asynchronous founder check to one authenticated
 * user/session/subscription snapshot. It prevents a result for a previous
 * account or session from changing the next account's Atlas UI.
 */
export interface AtlasEntitlementRequest {
  userId: string;
  session: object;
  subscriptionTier: Tier;
  revision: number;
}

export interface AtlasEntitlementResolution {
  request: AtlasEntitlementRequest;
  tier: Tier;
  isFounder: boolean;
}

/** Only a successful RPC response with a literal boolean true grants Pro. */
export function isVerifiedAtlasFounder(value: unknown, rpcError: unknown = null): boolean {
  return (rpcError === null || rpcError === undefined) && value === true;
}

/**
 * Founder access is Atlas-scoped. On any absent, malformed, or failed RPC
 * response, preserve the already-resolved subscription tier without upgrading.
 */
export function resolveAtlasEffectiveTier(
  subscriptionTier: Tier,
  founderEntitlement: unknown,
  rpcError: unknown = null,
): Tier {
  return isVerifiedAtlasFounder(founderEntitlement, rpcError)
    ? "elite"
    : subscriptionTier;
}

export function isCurrentAtlasEntitlementRequest(
  resolution: AtlasEntitlementResolution | null,
  request: AtlasEntitlementRequest | null,
): boolean {
  return Boolean(
    resolution &&
      request &&
      resolution.request.userId === request.userId &&
      resolution.request.session === request.session &&
      resolution.request.subscriptionTier === request.subscriptionTier &&
      resolution.request.revision === request.revision,
  );
}
