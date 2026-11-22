import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Tier, meetsTier } from "@/lib/tiers";
import {
  isCurrentSubscriptionIdentity,
  isCurrentSubscriptionRequest,
} from "@/lib/subscriptionState";

interface SubscriptionState {
  tier: Tier;
  isAdmin: boolean;
  status: string;
  loading: boolean;
  /** `true` if the active subscription tier meets the required tier. */
  hasAccess: (required: Tier) => boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState>({
  tier: "free",
  isAdmin: false,
  status: "active",
  loading: true,
  hasAccess: () => false,
  refresh: async () => {},
});

interface SubscriptionSnapshot {
  /** The account for which this snapshot was loaded. */
  userId: string | null;
  tier: Tier;
  isAdmin: boolean;
  status: string;
  loading: boolean;
}

const initialSnapshot: SubscriptionSnapshot = {
  userId: null,
  tier: "free",
  isAdmin: false,
  status: "active",
  loading: true,
};

function normalizeTier(value: string): Tier {
  if (value === "creator") return "professional";
  if (value === "visionary") return "elite";
  return value === "builder" || value === "professional" || value === "elite" ? value : "free";
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot>(initialSnapshot);
  const requestVersionRef = useRef(0);

  const load = useCallback(async () => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    if (!userId) {
      setSnapshot({ ...initialSnapshot, loading: false });
      return;
    }

    // Reset synchronously to a fail-closed state for this account. The render
    // immediately after a switch also derives a safe fallback below, before
    // this effect gets a chance to execute.
    setSnapshot({ ...initialSnapshot, userId, loading: true });

    try {
      const [subRes, roleRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("tier,status,current_period_end")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle(),
      ]);

      if (!isCurrentSubscriptionRequest(requestVersion, requestVersionRef.current)) return;

      if (subRes.error || roleRes.error) {
        console.warn("Could not load subscription state", subRes.error ?? roleRes.error);
        setSnapshot({ ...initialSnapshot, userId, loading: false });
        return;
      }

      if (subRes.data) {
        const active =
          (subRes.data.status === "active" || subRes.data.status === "trialing") &&
          (!subRes.data.current_period_end || new Date(subRes.data.current_period_end) > new Date());
        setSnapshot({
          userId,
          tier: active ? normalizeTier(subRes.data.tier) : "free",
          isAdmin: !!roleRes.data,
          status: subRes.data.status,
          loading: false,
        });
        return;
      }

      setSnapshot({
        ...initialSnapshot,
        userId,
        isAdmin: !!roleRes.data,
        loading: false,
      });
    } catch (error) {
      if (!isCurrentSubscriptionRequest(requestVersion, requestVersionRef.current)) return;

      console.warn("Could not load subscription state", error);
      setSnapshot({ ...initialSnapshot, userId, loading: false });
    }
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const isCurrentIdentity = isCurrentSubscriptionIdentity(snapshot.userId, userId);
  const tier = isCurrentIdentity ? snapshot.tier : "free";
  const isAdmin = isCurrentIdentity ? snapshot.isAdmin : false;
  const status = isCurrentIdentity ? snapshot.status : "active";
  const loading = authLoading || !isCurrentIdentity || snapshot.loading;
  const hasAccess = useCallback((required: Tier) => meetsTier(tier, required), [tier]);
  const value = useMemo(
    () => ({ tier, isAdmin, status, loading, hasAccess, refresh: load }),
    [tier, isAdmin, status, loading, hasAccess, load]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
