-- Activate one monthly allowance at a time, on the subscription anniversary.
-- Preserve historical YYYY-MM keys so existing grants are not issued twice.
-- Paid balances expire at the end of their slice; purchased/promotional credits carry over.
CREATE OR REPLACE FUNCTION public.ensure_atlas_allowance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  account_id uuid := auth.uid();
  sub public.subscriptions%ROWTYPE;
  wallet public.atlas_credit_wallets%ROWTYPE;
  old_grant public.atlas_allowance_grants%ROWTYPE;
  cfg public.atlas_allowance_config%ROWTYPE;
  v_tier public.subscription_tier := 'free';
  v_key text;
  v_renewal timestamptz;
  utc_now timestamp := pg_catalog.now() AT TIME ZONE 'UTC';
  utc_start timestamp;
  cycle_start timestamp;
  month_index integer;
  new_flexible integer;
  new_reserve integer;
  used_flexible bigint := 0;
  used_reserve bigint := 0;
  has_wallet boolean;
  has_grant boolean;
  result jsonb;
BEGIN
  IF account_id IS NULL THEN RAISE EXCEPTION 'Atlas allowance requires authentication'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('atlas-wallet:' || account_id::text, 0));
  SELECT * INTO sub FROM public.subscriptions WHERE user_id = account_id FOR UPDATE;
  IF FOUND AND sub.tier <> 'free' AND sub.status IN ('active','trialing')
     AND sub.current_period_start IS NOT NULL AND sub.current_period_end IS NOT NULL
     AND sub.current_period_start <= pg_catalog.now() AND sub.current_period_end > pg_catalog.now() THEN
    v_tier := sub.tier;
    utc_start := sub.current_period_start AT TIME ZONE 'UTC';
    month_index := (extract(year FROM utc_now)::integer - extract(year FROM utc_start)::integer) * 12
      + extract(month FROM utc_now)::integer - extract(month FROM utc_start)::integer;
    -- Compute every anniversary from the original anchor, avoiding cumulative
    -- month-end drift (Jan 31 -> Feb 28 -> Mar 31).
    IF utc_now < utc_start + month_index * interval '1 month' THEN
      month_index := month_index - 1;
    END IF;
    cycle_start := utc_start + month_index * interval '1 month';
    v_key := 'atlas:' || account_id::text || ':' || pg_catalog.to_char(cycle_start,'YYYY-MM');
    v_renewal := LEAST(sub.current_period_end,
      (utc_start + (month_index + 1) * interval '1 month') AT TIME ZONE 'UTC');
  ELSE
    -- One lifetime free trial, not a fresh grant on every downgrade.
    v_key := 'atlas:' || account_id::text || ':trial';
    v_renewal := pg_catalog.now();
  END IF;

  SELECT * INTO old_grant FROM public.atlas_allowance_grants
    WHERE user_id = account_id AND period_key = v_key AND grant_type = 'subscription' FOR UPDATE;
  has_grant := FOUND;
  SELECT * INTO wallet FROM public.atlas_credit_wallets WHERE user_id = account_id FOR UPDATE;
  has_wallet := FOUND;

  IF has_grant AND old_grant.tier = v_tier THEN
    -- Honor the original grant version for this slice, even if a new config exists.
    new_flexible := old_grant.flexible_granted;
    new_reserve := old_grant.reserve_granted;
  ELSE
    SELECT * INTO cfg FROM public.atlas_allowance_config WHERE tier = v_tier AND active;
    IF NOT FOUND THEN RAISE EXCEPTION 'Atlas allowance configuration unavailable'; END IF;
    new_flexible := CASE WHEN v_tier = 'free' THEN cfg.monthly_credits
      ELSE (cfg.monthly_credits * cfg.flexible_percent) / 100 END;
    new_reserve := cfg.monthly_credits - new_flexible;
    INSERT INTO public.atlas_allowance_grants
      (user_id,period_key,config_version,tier,flexible_granted,reserve_granted,grant_type)
    VALUES (account_id,v_key,cfg.config_version,v_tier,new_flexible,new_reserve,'subscription')
    ON CONFLICT (user_id,period_key,grant_type) DO UPDATE SET
      config_version=EXCLUDED.config_version,tier=EXCLUDED.tier,
      flexible_granted=EXCLUDED.flexible_granted,reserve_granted=EXCLUDED.reserve_granted;
  END IF;

  IF has_wallet AND wallet.period_key = v_key AND has_grant AND old_grant.tier = v_tier THEN
    -- Repeated calls never replenish a live wallet.
    UPDATE public.atlas_credit_wallets SET renewal_at=v_renewal WHERE user_id=account_id;
  ELSE
    -- Recover prior usage for an already visited period, including legacy
    -- pre-created quarterly grants. Grant entries themselves are not spending.
    SELECT GREATEST(0, -COALESCE(sum(delta) FILTER (WHERE bucket='flexible'),0)),
           GREATEST(0, -COALESCE(sum(delta) FILTER (WHERE bucket='reserve'),0))
      INTO used_flexible, used_reserve
    FROM public.atlas_credit_ledger
    WHERE user_id=account_id AND period_key=v_key
      AND reference_type IN ('atlas_request','atlas_settlement','atlas_reconciliation');
    IF has_wallet AND wallet.period_key=v_key AND has_grant THEN
      -- Preserve deductions not reflected in historical ledger entries.
      used_flexible := GREATEST(used_flexible,old_grant.flexible_granted-wallet.flexible_balance);
      used_reserve := GREATEST(used_reserve,old_grant.reserve_granted-wallet.reserve_balance);
    END IF;
    INSERT INTO public.atlas_credit_wallets(user_id,period_key,flexible_balance,reserve_balance,renewal_at,essential_mode)
    VALUES(account_id,v_key,GREATEST(new_flexible-used_flexible,0)::integer,
      GREATEST(new_reserve-used_reserve,0)::integer,v_renewal,new_flexible<=used_flexible)
    ON CONFLICT(user_id) DO UPDATE SET period_key=EXCLUDED.period_key,
      flexible_balance=EXCLUDED.flexible_balance,reserve_balance=EXCLUDED.reserve_balance,
      renewal_at=EXCLUDED.renewal_at,essential_mode=EXCLUDED.essential_mode,updated_at=pg_catalog.now();
  END IF;

  -- Keep the legacy grant reference convention for exactly-once grant records.
  INSERT INTO public.atlas_credit_ledger(user_id,period_key,bucket,delta,reason,reference_type,reference_id)
    VALUES(account_id,v_key,'flexible',new_flexible,'Atlas monthly allowance grant','atlas_allowance',v_key||':subscription')
    ON CONFLICT(reference_type,reference_id,bucket) DO NOTHING;
  IF new_reserve > 0 THEN
    INSERT INTO public.atlas_credit_ledger(user_id,period_key,bucket,delta,reason,reference_type,reference_id)
      VALUES(account_id,v_key,'reserve',new_reserve,'Atlas protected reserve grant','atlas_allowance',v_key||':reserve')
      ON CONFLICT(reference_type,reference_id,bucket) DO NOTHING;
  END IF;

  SELECT jsonb_build_object('available',w.flexible_balance+w.reserve_balance+w.promotional_balance+w.purchased_balance,
    'flexible',w.flexible_balance,'reserve',w.reserve_balance,'promotional',w.promotional_balance,
    'purchased',w.purchased_balance,'renewal_at',w.renewal_at,'essential_mode',w.essential_mode,'period_key',w.period_key)
    INTO result FROM public.atlas_credit_wallets w WHERE w.user_id=account_id;
  RETURN COALESCE(result,'{}'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_atlas_allowance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_atlas_allowance() TO authenticated;
