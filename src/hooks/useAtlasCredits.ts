import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AtlasCreditStatus {
  available: number;
  flexible: number;
  reserve: number;
  promotional: number;
  purchased: number;
  renewalAt: string | null;
  essentialMode: boolean;
  periodKey: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useAtlasCredits(): AtlasCreditStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<Omit<AtlasCreditStatus, "loading" | "refresh">>({
    available: 0,
    flexible: 0,
    reserve: 0,
    promotional: 0,
    purchased: 0,
    renewalAt: null,
    essentialMode: false,
    periodKey: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus({
        available: 0, flexible: 0, reserve: 0, promotional: 0, purchased: 0,
        renewalAt: null, essentialMode: false, periodKey: null,
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("ensure_atlas_allowance");
    if (error || !data || typeof data !== "object") {
      setStatus({
        available: 0, flexible: 0, reserve: 0, promotional: 0, purchased: 0,
        renewalAt: null, essentialMode: false, periodKey: null,
      });
      setLoading(false);
      return;
    }
    const value = data as Record<string, unknown>;
    setStatus({
      available: typeof value.available === "number" ? value.available : 0,
      flexible: typeof value.flexible === "number" ? value.flexible : 0,
      reserve: typeof value.reserve === "number" ? value.reserve : 0,
      promotional: typeof value.promotional === "number" ? value.promotional : 0,
      purchased: typeof value.purchased === "number" ? value.purchased : 0,
      renewalAt: typeof value.renewal_at === "string" ? value.renewal_at : null,
      essentialMode: value.essential_mode === true,
      periodKey: typeof value.period_key === "string" ? value.period_key : null,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({ ...status, loading, refresh }),
    [loading, refresh, status],
  );
}
