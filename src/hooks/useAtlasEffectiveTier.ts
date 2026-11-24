import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import type { Tier } from "@/lib/tiers";
import {
  isCurrentAtlasEntitlementRequest,
  isVerifiedAtlasFounder,
  resolveAtlasEffectiveTier,
  type AtlasEntitlementRequest,
  type AtlasEntitlementResolution,
} from "@/lib/atlas/effectiveTier";

export interface AtlasEffectiveTierState {
  /** Atlas-only tier. This never changes the global subscription tier. */
  tier: Tier;
  /** True until subscription state and the current founder check have settled. */
  loading: boolean;
  /** True only for the current session after a server-confirmed founder RPC. */
  isFounder: boolean;
  /** Recheck the server-controlled entitlement for the current session. */
  refresh: () => void;
}

/**
 * Resolves an Atlas-only effective tier from the normal subscription tier plus
 * the server-controlled founder RPC. It intentionally fails closed for any
 * missing session, stale response, malformed response, or RPC error.
 */
export function useAtlasEffectiveTier(): AtlasEffectiveTierState {
  const { user, session, loading: authLoading } = useAuth();
  const { tier: subscriptionTier, loading: subscriptionLoading } = useSubscription();
  const userId = user?.id ?? null;
  const [revision, setRevision] = useState(0);
  const [resolution, setResolution] = useState<AtlasEntitlementResolution | null>(null);

  const request = useMemo<AtlasEntitlementRequest | null>(() => {
    if (!userId || !session || session.user.id !== userId) return null;

    return {
      userId,
      session,
      subscriptionTier,
      revision,
    };
  }, [revision, session, subscriptionTier, userId]);

  useEffect(() => {
    let cancelled = false;

    if (authLoading || subscriptionLoading) {
      return () => {
        cancelled = true;
      };
    }

    if (!request) {
      setResolution(null);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const { data, error } = await supabase.rpc("has_founder_atlas_entitlement" as never);
        if (cancelled) return;

        setResolution({
          request,
          tier: resolveAtlasEffectiveTier(request.subscriptionTier, data, error),
          isFounder: isVerifiedAtlasFounder(data, error),
        });
      } catch {
        if (cancelled) return;

        setResolution({
          request,
          tier: request.subscriptionTier,
          isFounder: false,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, request, subscriptionLoading]);

  const current = isCurrentAtlasEntitlementRequest(resolution, request);
  const loading = authLoading || subscriptionLoading || Boolean(request && !current);
  const refresh = useCallback(() => setRevision((currentRevision) => currentRevision + 1), []);

  if (!userId || !request || !current) {
    return { tier: "free", loading, isFounder: false, refresh };
  }

  return {
    tier: resolution.tier,
    loading,
    isFounder: resolution.isFounder,
    refresh,
  };
}
