import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Tier, meetsTier } from "@/lib/tiers";

interface SubscriptionState {
  tier: Tier;
  isAdmin: boolean;
  status: string;
  loading: boolean;
  /** `true` if the effective tier meets the required tier (admin always passes). */
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

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [tier, setTier] = useState<Tier>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<string>("active");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setTier("free");
      setIsAdmin(false);
      setStatus("active");
      setLoading(false);
      return;
    }
    setLoading(true);
    const [subRes, roleRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("tier,status,current_period_end")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle(),
    ]);

    if (subRes.error || roleRes.error) {
      console.warn("Could not load subscription state", subRes.error ?? roleRes.error);
      setTier("free");
      setIsAdmin(false);
      setStatus("active");
      setLoading(false);
      return;
    }

    const admin = !!roleRes.data;
    setIsAdmin(admin);

    if (admin) {
      setTier("visionary");
      setStatus("active");
    } else if (subRes.data) {
      const active =
        (subRes.data.status === "active" || subRes.data.status === "trialing") &&
        (!subRes.data.current_period_end || new Date(subRes.data.current_period_end) > new Date());
      setTier(active ? (subRes.data.tier as Tier) : "free");
      setStatus(subRes.data.status);
    } else {
      setTier("free");
      setStatus("active");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

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
