CREATE OR REPLACE FUNCTION public.atlas_grant_allowance(
  _user_id uuid,
  _tier public.subscription_tier,
  _period_key text,
  _renewal_at timestamptz,
  _grant_type text DEFAULT 'subscription'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  account_id uuid := _user_id;
  cfg public.atlas_allowance_config%ROWTYPE;
  flexible integer;
  reserve integer;
  existing_grant public.atlas_allowance_grants%ROWTYPE;
  wallet public.atlas_credit_wallets%ROWTYPE;
BEGIN
  IF account_id IS NULL OR NULLIF(_period_key, '') IS NULL
     OR _grant_type NOT IN ('subscription','promotional','purchased')
     OR _renewal_at IS NULL THEN
    RAISE EXCEPTION 'Invalid Atlas allowance grant';
  END IF;
  SELECT * INTO cfg FROM public.atlas_allowance_config
    WHERE tier = _tier AND active
    ORDER BY config_version DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Atlas allowance configuration unavailable'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('atlas-wallet:' || account_id::text, 0));
  SELECT * INTO existing_grant FROM public.atlas_allowance_grants
    WHERE user_id = account_id AND period_key = _period_key AND grant_type = _grant_type
    FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object('granted', false, 'period_key', _period_key);
  END IF;

  flexible := CASE WHEN _grant_type = 'subscription'
    THEN (cfg.monthly_credits * cfg.flexible_percent) / 100
    ELSE cfg.monthly_credits END;
  reserve := CASE WHEN _grant_type = 'subscription'
    THEN cfg.monthly_credits - flexible ELSE 0 END;

  INSERT INTO public.atlas_allowance_grants
    (user_id, period_key, config_version, tier, flexible_granted, reserve_granted, grant_type)
  VALUES (account_id, _period_key, cfg.config_version, _tier, flexible, reserve, _grant_type);

  INSERT INTO public.atlas_credit_wallets
    (user_id, period_key, flexible_balance, reserve_balance, promotional_balance, purchased_balance, renewal_at)
  VALUES (
    account_id, _period_key,
    CASE WHEN _grant_type = 'subscription' THEN flexible ELSE 0 END,
    CASE WHEN _grant_type = 'subscription' THEN reserve ELSE 0 END,
    CASE WHEN _grant_type = 'promotional' THEN flexible ELSE 0 END,
    CASE WHEN _grant_type = 'purchased' THEN flexible ELSE 0 END,
    _renewal_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    period_key = CASE WHEN _grant_type = 'subscription'
      THEN EXCLUDED.period_key ELSE public.atlas_credit_wallets.period_key END,
    flexible_balance = CASE WHEN _grant_type = 'subscription'
      THEN public.atlas_credit_wallets.flexible_balance + flexible
      ELSE public.atlas_credit_wallets.flexible_balance END,
    reserve_balance = CASE WHEN _grant_type = 'subscription'
      THEN public.atlas_credit_wallets.reserve_balance + reserve
      ELSE public.atlas_credit_wallets.reserve_balance END,
    promotional_balance = CASE WHEN _grant_type = 'promotional'
      THEN public.atlas_credit_wallets.promotional_balance + flexible
      ELSE public.atlas_credit_wallets.promotional_balance END,
    purchased_balance = CASE WHEN _grant_type = 'purchased'
      THEN public.atlas_credit_wallets.purchased_balance + flexible
      ELSE public.atlas_credit_wallets.purchased_balance END,
    renewal_at = CASE WHEN _grant_type = 'subscription'
      THEN EXCLUDED.renewal_at ELSE public.atlas_credit_wallets.renewal_at END,
    essential_mode = CASE WHEN _grant_type = 'subscription'
      THEN false ELSE public.atlas_credit_wallets.essential_mode END,
    updated_at = pg_catalog.now();

  IF NOT FOUND THEN
    SELECT * INTO wallet FROM public.atlas_credit_wallets WHERE user_id = account_id;
  END IF;

  INSERT INTO public.atlas_credit_ledger
    (user_id, period_key, bucket, delta, reason, reference_type, reference_id)
  VALUES
    (account_id, _period_key,
     CASE WHEN _grant_type = 'promotional' THEN 'promotional'
          WHEN _grant_type = 'purchased' THEN 'purchased'
          ELSE 'flexible' END,
     flexible, _grant_type || ' allowance grant',
     'atlas_allowance', _period_key || ':' || _grant_type)
    ,(account_id, _period_key, 'reserve', reserve,
      'protected continuity reserve', 'atlas_allowance',
      _period_key || ':reserve')
  ON CONFLICT (reference_type, reference_id, bucket) DO NOTHING;

  RETURN jsonb_build_object(
    'granted', true,
    'period_key', _period_key,
    'flexible', flexible,
    'reserve', reserve,
    'config_version', cfg.config_version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.atlas_grant_allowance(uuid, public.subscription_tier, text, timestamptz, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atlas_grant_allowance(uuid, public.subscription_tier, text, timestamptz, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.atlas_reserve_request(
  _request_id text,
  _model text,
  _worst_case_credits integer,
  _worst_case_budget_micro_kes bigint,
  _period_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  account_id uuid := auth.uid();
  wallet public.atlas_credit_wallets%ROWTYPE;
  existing_request public.atlas_usage_requests%ROWTYPE;
  controls public.atlas_financial_controls%ROWTYPE;
  individual_spend bigint;
  global_spend bigint;
  available integer;
  reserved_promotional integer;
  reserved_purchased integer;
  reserved_flexible integer;
  reserved_reserve integer;
BEGIN
  IF account_id IS NULL OR NULLIF(_request_id, '') IS NULL
     OR NULLIF(_model, '') IS NULL OR NULLIF(_period_key, '') IS NULL
     OR _worst_case_credits <= 0 OR _worst_case_budget_micro_kes <= 0 THEN
    RAISE EXCEPTION 'Invalid Atlas reservation';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('atlas-wallet:' || account_id::text, 0));
  SELECT * INTO existing_request FROM public.atlas_usage_requests
    WHERE user_id = account_id AND request_id = _request_id FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'reserved', existing_request.status = 'reserved',
      'request_uuid', existing_request.id,
      'reserved_credits', existing_request.reserved_credits,
      'reserved_budget_micro_kes', existing_request.reserved_budget_micro_kes,
      'duplicate', true
    );
  END IF;

  SELECT * INTO controls FROM public.atlas_financial_controls WHERE id = 1 FOR UPDATE;
  IF NOT FOUND OR controls.emergency_shutdown THEN
    RETURN jsonb_build_object('reserved', false, 'reason', 'generation_unavailable');
  END IF;

  SELECT COALESCE(sum(
    CASE WHEN status = 'reserved' THEN reserved_budget_micro_kes ELSE actual_budget_micro_kes END
  ), 0) INTO individual_spend
    FROM public.atlas_usage_requests
    WHERE user_id = account_id
      AND created_at >= pg_catalog.date_trunc('day', pg_catalog.now());
  SELECT COALESCE(sum(
    CASE WHEN status = 'reserved' THEN reserved_budget_micro_kes ELSE actual_budget_micro_kes END
  ), 0) INTO global_spend
    FROM public.atlas_usage_requests
    WHERE created_at >= pg_catalog.date_trunc('day', pg_catalog.now());

  IF individual_spend + _worst_case_budget_micro_kes > controls.individual_daily_budget_micro_kes
     OR global_spend + _worst_case_budget_micro_kes > controls.global_daily_budget_micro_kes THEN
    RETURN jsonb_build_object('reserved', false, 'reason', 'spending_limit');
  END IF;

  SELECT * INTO wallet FROM public.atlas_credit_wallets
    WHERE user_id = account_id AND period_key = _period_key FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('reserved', false, 'reason', 'wallet_unavailable');
  END IF;
  available := wallet.flexible_balance + wallet.reserve_balance + wallet.purchased_balance + wallet.promotional_balance;
  IF available < _worst_case_credits THEN
    RETURN jsonb_build_object(
      'reserved', false,
      'reason', 'insufficient_credits',
      'available', available
    );
  END IF;

  INSERT INTO public.atlas_usage_requests
    (request_id, user_id, period_key, model, status, reserved_credits, reserved_budget_micro_kes,
     reserved_promotional, reserved_purchased, reserved_flexible, reserved_reserve)
  VALUES (_request_id, account_id, _period_key, _model, 'reserved',
          _worst_case_credits, _worst_case_budget_micro_kes,
          LEAST(_worst_case_credits, wallet.promotional_balance),
          LEAST(GREATEST(_worst_case_credits - wallet.promotional_balance, 0), wallet.purchased_balance),
          LEAST(GREATEST(_worst_case_credits - wallet.promotional_balance - wallet.purchased_balance, 0),
                wallet.flexible_balance),
          LEAST(GREATEST(_worst_case_credits - wallet.promotional_balance -
                         wallet.purchased_balance - wallet.flexible_balance, 0),
                wallet.reserve_balance))
  RETURNING * INTO existing_request;

  UPDATE public.atlas_credit_wallets
  SET promotional_balance = GREATEST(promotional_balance -
        LEAST(_worst_case_credits, promotional_balance), 0),
      purchased_balance = GREATEST(purchased_balance -
        LEAST(GREATEST(_worst_case_credits - promotional_balance, 0), purchased_balance), 0),
      flexible_balance = GREATEST(flexible_balance -
        LEAST(GREATEST(_worst_case_credits - promotional_balance - purchased_balance, 0),
              flexible_balance), 0),
      reserve_balance = GREATEST(reserve_balance -
        LEAST(GREATEST(_worst_case_credits - promotional_balance -
                       purchased_balance - flexible_balance, 0), reserve_balance), 0),
      essential_mode = (
        flexible_balance -
        LEAST(GREATEST(_worst_case_credits - promotional_balance - purchased_balance, 0),
              flexible_balance) = 0
      )
  WHERE user_id = account_id AND period_key = _period_key;

  INSERT INTO public.atlas_credit_ledger
    (user_id, period_key, bucket, delta, reason, reference_type, reference_id)
  VALUES
    (account_id, _period_key, 'promotional',
     -LEAST(_worst_case_credits, wallet.promotional_balance),
     'Atlas request reservation', 'atlas_request', existing_request.id::text),
    (account_id, _period_key, 'purchased',
     -LEAST(GREATEST(_worst_case_credits - wallet.promotional_balance, 0),
            wallet.purchased_balance),
     'Atlas request reservation', 'atlas_request', existing_request.id::text),
    (account_id, _period_key, 'flexible',
     -LEAST(GREATEST(_worst_case_credits - wallet.promotional_balance -
                     wallet.purchased_balance, 0), wallet.flexible_balance),
     'Atlas request reservation', 'atlas_request', existing_request.id::text),
    (account_id, _period_key, 'reserve',
     -LEAST(GREATEST(_worst_case_credits - wallet.promotional_balance -
                     wallet.purchased_balance - wallet.flexible_balance, 0),
            wallet.reserve_balance),
     'Atlas request reservation', 'atlas_request', existing_request.id::text)
  ON CONFLICT (reference_type, reference_id, bucket) DO NOTHING;

  RETURN jsonb_build_object(
    'reserved', true,
    'request_uuid', existing_request.id,
    'reserved_credits', _worst_case_credits,
    'reserved_budget_micro_kes', _worst_case_budget_micro_kes,
    'essential_mode', wallet.essential_mode
  );
END;
$$;

REVOKE ALL ON FUNCTION public.atlas_reserve_request(text, text, integer, bigint, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atlas_reserve_request(text, text, integer, bigint, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.atlas_settle_request(
  _request_uuid uuid,
  _status text,
  _actual_credits integer,
  _actual_budget_micro_kes bigint,
  _input_tokens integer,
  _output_tokens integer,
  _cached_tokens integer,
  _reconciliation text DEFAULT 'none'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request public.atlas_usage_requests%ROWTYPE;
  unused_credits integer;
  unused_budget bigint;
  wallet public.atlas_credit_wallets%ROWTYPE;
  refund_promotional integer;
  refund_purchased integer;
  refund_flexible integer;
  refund_reserve integer;
BEGIN
  IF _status NOT IN ('settled','released','uncertain','failed')
     OR _actual_credits < 0 OR _actual_budget_micro_kes < 0
     OR _input_tokens < 0 OR _output_tokens < 0 OR _cached_tokens < 0 THEN
    RAISE EXCEPTION 'Invalid Atlas settlement';
  END IF;

  SELECT * INTO request FROM public.atlas_usage_requests
    WHERE id = _request_uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Atlas request not found'; END IF;
  IF request.status <> 'reserved' THEN
    RETURN jsonb_build_object(
      'settled', true,
      'duplicate', true,
      'status', request.status,
      'actual_credits', request.actual_credits
    );
  END IF;

  IF _status = 'uncertain' THEN
    unused_credits := 0;
    unused_budget := 0;
  ELSIF _status = 'failed' THEN
    unused_credits := request.reserved_credits;
    unused_budget := request.reserved_budget_micro_kes;
  ELSE
    unused_credits := GREATEST(request.reserved_credits - _actual_credits, 0);
    unused_budget := GREATEST(request.reserved_budget_micro_kes - _actual_budget_micro_kes, 0);
  END IF;

  UPDATE public.atlas_usage_requests SET
    status = _status,
    actual_credits = CASE WHEN _status = 'uncertain' THEN request.reserved_credits ELSE _actual_credits END,
    actual_budget_micro_kes = CASE WHEN _status = 'uncertain'
      THEN request.reserved_budget_micro_kes ELSE _actual_budget_micro_kes END,
    input_tokens = _input_tokens,
    output_tokens = _output_tokens,
    cached_tokens = _cached_tokens,
    reconciliation = CASE WHEN _status = 'uncertain' THEN 'provider_uncertain' ELSE _reconciliation END,
    settled_at = pg_catalog.now()
  WHERE id = _request_uuid;

  IF unused_credits > 0 THEN
    SELECT * INTO wallet FROM public.atlas_credit_wallets
      WHERE user_id = request.user_id AND period_key = request.period_key FOR UPDATE;

    IF _status = 'failed' THEN
      UPDATE public.atlas_credit_wallets SET
        promotional_balance = promotional_balance + request.reserved_promotional,
        purchased_balance = purchased_balance + request.reserved_purchased,
        flexible_balance = flexible_balance + request.reserved_flexible,
        reserve_balance = reserve_balance + request.reserved_reserve,
        essential_mode = CASE
          WHEN flexible_balance + request.reserved_flexible > 0 THEN false
          ELSE reserve_balance + request.reserved_reserve <= 0
        END,
        updated_at = pg_catalog.now()
      WHERE user_id = request.user_id AND period_key = request.period_key;
    ELSE
      refund_promotional := LEAST(request.reserved_promotional, unused_credits);
      refund_purchased := LEAST(request.reserved_purchased,
        GREATEST(unused_credits - refund_promotional, 0));
      refund_flexible := LEAST(request.reserved_flexible,
        GREATEST(unused_credits - refund_promotional - refund_purchased, 0));
      refund_reserve := GREATEST(unused_credits - refund_promotional -
                                refund_purchased - refund_flexible, 0);
      UPDATE public.atlas_credit_wallets SET
        promotional_balance = promotional_balance + refund_promotional,
        purchased_balance = purchased_balance + refund_purchased,
        flexible_balance = flexible_balance + refund_flexible,
        reserve_balance = reserve_balance + refund_reserve,
        essential_mode = flexible_balance + refund_flexible = 0
          AND reserve_balance + refund_reserve = 0,
        updated_at = pg_catalog.now()
      WHERE user_id = request.user_id AND period_key = request.period_key;
    END IF;
  END IF;

  INSERT INTO public.atlas_credit_ledger
    (user_id, period_key, bucket, delta, reason, reference_type, reference_id)
  SELECT l.user_id, l.period_key, l.bucket, l.delta, l.reason, l.reference_type, l.reference_id
  FROM (
    VALUES
      (request.user_id, request.period_key, 'flexible',
       CASE WHEN _status = 'failed' THEN request.reserved_flexible ELSE refund_flexible END,
       'Atlas reservation release', 'atlas_settlement', request.id::text),
      (request.user_id, request.period_key, 'reserve',
       CASE WHEN _status = 'failed' THEN request.reserved_reserve ELSE refund_reserve END,
       'Atlas reservation release', 'atlas_settlement', request.id::text),
      (request.user_id, request.period_key, 'promotional',
       CASE WHEN _status = 'failed' THEN request.reserved_promotional ELSE refund_promotional END,
       'Atlas reservation release', 'atlas_settlement', request.id::text),
      (request.user_id, request.period_key, 'purchased',
       CASE WHEN _status = 'failed' THEN request.reserved_purchased ELSE refund_purchased END,
       'Atlas reservation release', 'atlas_settlement', request.id::text)
  ) AS l(user_id, period_key, bucket, delta, reason, reference_type, reference_id)
  WHERE l.delta > 0
  ON CONFLICT (reference_type, reference_id, bucket) DO NOTHING;

  RETURN jsonb_build_object(
    'settled', true,
    'status', _status,
    'actual_credits', CASE WHEN _status = 'uncertain' THEN request.reserved_credits ELSE _actual_credits END,
    'unused_credits', unused_credits,
    'unused_budget_micro_kes', unused_budget,
    'reconciliation', CASE WHEN _status = 'uncertain' THEN 'provider_uncertain' ELSE _reconciliation END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.atlas_settle_request(uuid, text, integer, bigint, integer, integer, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atlas_settle_request(uuid, text, integer, bigint, integer, integer, integer, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.atlas_wallet_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'available', w.flexible_balance + w.reserve_balance + w.promotional_balance + w.purchased_balance,
    'flexible', w.flexible_balance,
    'reserve', w.reserve_balance,
    'promotional', w.promotional_balance,
    'purchased', w.purchased_balance,
    'renewal_at', w.renewal_at,
    'essential_mode', w.essential_mode,
    'period_key', w.period_key
  )
  FROM public.atlas_credit_wallets w
  WHERE w.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.atlas_wallet_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atlas_wallet_status() TO authenticated;
