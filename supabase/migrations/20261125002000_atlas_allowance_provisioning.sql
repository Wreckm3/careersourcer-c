CREATE OR REPLACE FUNCTION public.ensure_atlas_allowance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  account_id uuid := auth.uid();
  subscription public.subscriptions%ROWTYPE;
  period_key text;
  tier public.subscription_tier;
  renewal_at timestamptz;
  result jsonb;
  existing_grant public.atlas_allowance_grants%ROWTYPE;
BEGIN
  IF account_id IS NULL THEN RAISE EXCEPTION 'Atlas allowance requires authentication'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('atlas-wallet:' || account_id::text, 0));
  SELECT * INTO subscription FROM public.subscriptions WHERE user_id = account_id FOR UPDATE;

  IF FOUND
     AND subscription.status IN ('active','trialing')
     AND (subscription.current_period_end IS NULL OR subscription.current_period_end > pg_catalog.now()) THEN
    tier := subscription.tier;
    renewal_at := COALESCE(subscription.current_period_end, pg_catalog.now() + interval '30 days');
  ELSE
    tier := 'free';
    renewal_at := pg_catalog.now();
  END IF;

  period_key := 'atlas:' || account_id::text || ':' || pg_catalog.to_char(renewal_at, 'YYYY-MM-DD');
  SELECT * INTO subscription FROM public.subscriptions WHERE user_id = account_id;
  SELECT * INTO existing_grant FROM public.atlas_allowance_grants
    WHERE user_id = account_id
      AND period_key = period_key
      AND grant_type = 'subscription'
    FOR UPDATE;

  IF NOT FOUND OR existing_grant.tier IS DISTINCT FROM tier THEN
    INSERT INTO public.atlas_allowance_grants
      (user_id, period_key, config_version, tier, flexible_granted, reserve_granted, grant_type)
    SELECT account_id, period_key, c.config_version, tier,
      CASE WHEN tier = 'free' THEN c.monthly_credits
           ELSE (c.monthly_credits * c.flexible_percent) / 100 END,
      CASE WHEN tier = 'free' THEN 0
           ELSE c.monthly_credits - (c.monthly_credits * c.flexible_percent) / 100 END,
      'subscription'
    FROM public.atlas_allowance_config c
    WHERE c.tier = tier AND c.active
    ORDER BY c.config_version DESC LIMIT 1;

    INSERT INTO public.atlas_credit_wallets
      (user_id, period_key, flexible_balance, reserve_balance, renewal_at)
    SELECT account_id, period_key,
      CASE WHEN tier = 'free' THEN c.monthly_credits
           ELSE (c.monthly_credits * c.flexible_percent) / 100 END,
      CASE WHEN tier = 'free' THEN 0
           ELSE c.monthly_credits - (c.monthly_credits * c.flexible_percent) / 100 END,
      renewal_at
    FROM public.atlas_allowance_config c
    WHERE c.tier = tier AND c.active
    ORDER BY c.config_version DESC LIMIT 1
    ON CONFLICT (user_id) DO UPDATE SET
      period_key = EXCLUDED.period_key,
      flexible_balance = EXCLUDED.flexible_balance,
      reserve_balance = EXCLUDED.reserve_balance,
      renewal_at = EXCLUDED.renewal_at,
      essential_mode = false,
      updated_at = pg_catalog.now();

    INSERT INTO public.atlas_credit_ledger
      (user_id, period_key, bucket, delta, reason, reference_type, reference_id)
    SELECT account_id, period_key, 'flexible',
      CASE WHEN tier = 'free' THEN c.monthly_credits
           ELSE (c.monthly_credits * c.flexible_percent) / 100 END,
      'Atlas monthly allowance grant', 'atlas_allowance',
      period_key || ':subscription'
    FROM public.atlas_allowance_config c
    WHERE c.tier = tier AND c.active
    ORDER BY c.config_version DESC LIMIT 1
    ON CONFLICT (reference_type, reference_id, bucket) DO NOTHING;

    INSERT INTO public.atlas_credit_ledger
      (user_id, period_key, bucket, delta, reason, reference_type, reference_id)
    SELECT account_id, period_key, 'reserve',
      CASE WHEN tier = 'free' THEN 0
           ELSE c.monthly_credits - (c.monthly_credits * c.flexible_percent) / 100 END,
      'Atlas protected reserve grant', 'atlas_allowance',
      period_key || ':reserve'
    FROM public.atlas_allowance_config c
    WHERE c.tier = tier AND c.active
      AND c.monthly_credits - (c.monthly_credits * c.flexible_percent) / 100 > 0
    ORDER BY c.config_version DESC LIMIT 1
    ON CONFLICT (reference_type, reference_id, bucket) DO NOTHING;
  END IF;

  SELECT jsonb_build_object(
    'available', w.flexible_balance + w.reserve_balance + w.promotional_balance + w.purchased_balance,
    'flexible', w.flexible_balance,
    'reserve', w.reserve_balance,
    'promotional', w.promotional_balance,
    'purchased', w.purchased_balance,
    'renewal_at', w.renewal_at,
    'essential_mode', w.essential_mode,
    'period_key', w.period_key
  ) INTO result
  FROM public.atlas_credit_wallets w
  WHERE w.user_id = account_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_atlas_allowance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_atlas_allowance() TO authenticated;
