CREATE TABLE IF NOT EXISTS public.atlas_allowance_config (
  config_version integer NOT NULL CHECK (config_version > 0),
  tier public.subscription_tier NOT NULL,
  monthly_credits integer NOT NULL CHECK (monthly_credits >= 0),
  flexible_percent integer NOT NULL CHECK (flexible_percent BETWEEN 0 AND 100),
  max_api_budget_kes integer NOT NULL CHECK (max_api_budget_kes >= 0),
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(config_version, tier)
);

CREATE UNIQUE INDEX IF NOT EXISTS atlas_allowance_active_tier_uidx
  ON public.atlas_allowance_config(tier) WHERE active;

CREATE TABLE IF NOT EXISTS public.atlas_model_pricing (
  model text PRIMARY KEY,
  config_version integer NOT NULL CHECK (config_version > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  input_micro_kes bigint NOT NULL CHECK (input_micro_kes >= 0),
  cached_input_micro_kes bigint NOT NULL CHECK (cached_input_micro_kes >= 0),
  output_micro_kes bigint NOT NULL CHECK (output_micro_kes >= 0),
  credit_micro_units bigint NOT NULL CHECK (credit_micro_units >= 0),
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.atlas_credit_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  flexible_balance integer NOT NULL DEFAULT 0 CHECK (flexible_balance >= 0),
  reserve_balance integer NOT NULL DEFAULT 0 CHECK (reserve_balance >= 0),
  promotional_balance integer NOT NULL DEFAULT 0 CHECK (promotional_balance >= 0),
  purchased_balance integer NOT NULL DEFAULT 0 CHECK (purchased_balance >= 0),
  renewal_at timestamptz,
  essential_mode boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.atlas_credit_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  bucket text NOT NULL CHECK (bucket IN ('flexible','reserve','promotional','purchased')),
  delta integer NOT NULL,
  reason text NOT NULL,
  reference_type text NOT NULL,
  reference_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reference_type, reference_id, bucket)
);

CREATE TABLE IF NOT EXISTS public.atlas_usage_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  model text NOT NULL,
  status text NOT NULL CHECK (status IN ('reserved','settled','released','uncertain','failed')),
  reserved_credits integer NOT NULL CHECK (reserved_credits >= 0),
  reserved_budget_micro_kes bigint NOT NULL CHECK (reserved_budget_micro_kes >= 0),
  reserved_flexible integer NOT NULL DEFAULT 0 CHECK (reserved_flexible >= 0),
  reserved_promotional integer NOT NULL DEFAULT 0 CHECK (reserved_promotional >= 0),
  reserved_purchased integer NOT NULL DEFAULT 0 CHECK (reserved_purchased >= 0),
  reserved_reserve integer NOT NULL DEFAULT 0 CHECK (reserved_reserve >= 0),
  actual_credits integer NOT NULL DEFAULT 0 CHECK (actual_credits >= 0),
  actual_budget_micro_kes bigint NOT NULL DEFAULT 0 CHECK (actual_budget_micro_kes >= 0),
  input_tokens integer NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens integer NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cached_tokens integer NOT NULL DEFAULT 0 CHECK (cached_tokens >= 0),
  reconciliation text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  UNIQUE(user_id, request_id)
);

CREATE TABLE IF NOT EXISTS public.atlas_allowance_grants (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  config_version integer NOT NULL,
  tier public.subscription_tier NOT NULL,
  flexible_granted integer NOT NULL CHECK (flexible_granted >= 0),
  reserve_granted integer NOT NULL CHECK (reserve_granted >= 0),
  grant_type text NOT NULL CHECK (grant_type IN ('subscription','promotional','purchased')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, period_key, grant_type)
);

CREATE TABLE IF NOT EXISTS public.atlas_financial_controls (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  emergency_shutdown boolean NOT NULL DEFAULT false,
  global_daily_budget_micro_kes bigint NOT NULL DEFAULT 2500000000 CHECK (global_daily_budget_micro_kes >= 0),
  individual_daily_budget_micro_kes bigint NOT NULL DEFAULT 250000 CHECK (individual_daily_budget_micro_kes >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.atlas_financial_controls(id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.atlas_allowance_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_model_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_usage_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_allowance_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_financial_controls ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.atlas_allowance_config, public.atlas_model_pricing,
  public.atlas_credit_wallets, public.atlas_credit_ledger,
  public.atlas_usage_requests, public.atlas_allowance_grants,
  public.atlas_financial_controls FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.atlas_credit_wallets, public.atlas_credit_ledger,
  public.atlas_usage_requests, public.atlas_allowance_grants TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

DROP POLICY IF EXISTS atlas_credit_wallets_read_own ON public.atlas_credit_wallets;
CREATE POLICY atlas_credit_wallets_read_own ON public.atlas_credit_wallets
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS atlas_credit_ledger_read_own ON public.atlas_credit_ledger;
CREATE POLICY atlas_credit_ledger_read_own ON public.atlas_credit_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS atlas_usage_requests_read_own ON public.atlas_usage_requests;
CREATE POLICY atlas_usage_requests_read_own ON public.atlas_usage_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS atlas_allowance_grants_read_own ON public.atlas_allowance_grants;
CREATE POLICY atlas_allowance_grants_read_own ON public.atlas_allowance_grants
  FOR SELECT TO authenticated USING (user_id = auth.uid());

INSERT INTO public.atlas_allowance_config
  (config_version, tier, monthly_credits, flexible_percent, max_api_budget_kes, active)
SELECT v, t, c, p, b, true
FROM (VALUES
  (1, 'free'::public.subscription_tier, 20, 100, 2),
  (1, 'builder'::public.subscription_tier, 300, 80, 30),
  (1, 'professional'::public.subscription_tier, 1200, 80, 120),
  (1, 'elite'::public.subscription_tier, 2500, 80, 250)
) AS seed(v, t, c, p, b)
WHERE NOT EXISTS (
  SELECT 1 FROM public.atlas_allowance_config c
  WHERE c.config_version = v AND c.tier = t
);
