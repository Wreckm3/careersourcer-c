-- Financial hardening: guard the production metered entry point without
-- changing existing credit grants or operator-configured daily limits.
-- Calendar windows follow the database timezone. Unresolved prior-period
-- requests continue to count until an operator reconciles them.
CREATE OR REPLACE FUNCTION public.atlas_reserve_metered_request(
  _user_id uuid, _request_id text, _model text, _credits integer, _max_output integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rate public.atlas_verified_metering_rates%ROWTYPE;
  controls public.atlas_financial_controls%ROWTYPE;
  existing_request public.atlas_usage_requests%ROWTYPE;
  result jsonb;
  budget bigint;
  monthly_limit bigint;
  individual_day numeric;
  global_day numeric;
  individual_month numeric;
  day_start timestamptz := pg_catalog.date_trunc('day', pg_catalog.now());
  month_start timestamptz := pg_catalog.date_trunc('month', pg_catalog.now());
BEGIN
  IF _user_id IS NULL OR NULLIF(_request_id, '') IS NULL OR NULLIF(_model, '') IS NULL
     OR _max_output IS NULL OR _max_output NOT BETWEEN 1 AND 16000
     OR _credits IS NULL OR _credits <= 0 THEN
    RAISE EXCEPTION 'INVALID_METERED_REQUEST';
  END IF;

  -- Match the underlying reservation's per-wallet lock order. Locking the
  -- global control row serializes metered reservations across accounts.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('atlas-wallet:' || _user_id::text, 0));
  SELECT * INTO existing_request FROM public.atlas_usage_requests
    WHERE user_id = _user_id AND request_id = _request_id FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object('reserved', existing_request.status = 'reserved',
      'request_uuid', existing_request.id, 'reserved_credits', existing_request.reserved_credits,
      'reserved_budget_micro_kes', existing_request.reserved_budget_micro_kes, 'duplicate', true);
  END IF;

  SELECT * INTO rate FROM public.atlas_verified_metering_rates
    WHERE model = _model AND verified_until > pg_catalog.now();
  IF NOT FOUND THEN RETURN jsonb_build_object('reserved', false, 'reason', 'pricing_unavailable'); END IF;
  budget := ceil((rate.input_rate::numeric * rate.input_token_ceiling + rate.output_rate::numeric * _max_output) / 1000000)::bigint;

  SELECT * INTO controls FROM public.atlas_financial_controls WHERE id = 1 FOR UPDATE;
  IF NOT FOUND OR controls.emergency_shutdown THEN
    RETURN jsonb_build_object('reserved', false, 'reason', 'generation_unavailable');
  END IF;

  -- Use the server-provisioned grant for the current wallet, not a client tier.
  -- An absent grant/configuration is not permission to spend unlimited money.
  SELECT c.max_api_budget_kes::bigint * 1000000 INTO monthly_limit
  FROM public.atlas_credit_wallets w
  JOIN public.atlas_allowance_grants g ON g.user_id = w.user_id
    AND g.period_key = w.period_key AND g.grant_type = 'subscription'
  JOIN public.atlas_allowance_config c ON c.tier = g.tier AND c.config_version = g.config_version
  WHERE w.user_id = _user_id;
  IF NOT FOUND OR monthly_limit IS NULL THEN
    RETURN jsonb_build_object('reserved', false, 'reason', 'budget_unavailable');
  END IF;

  -- Count unresolved requests even across calendar boundaries. Count settled
  -- costs in the settlement window as well as the original dispatch window.
  -- This deliberately favors conservative accounting over perfect allocation.
  SELECT
    COALESCE(sum(cost) FILTER (WHERE user_id = _user_id AND in_day), 0),
    COALESCE(sum(cost) FILTER (WHERE in_day), 0),
    COALESCE(sum(cost) FILTER (WHERE user_id = _user_id AND in_month), 0)
  INTO individual_day, global_day, individual_month
  FROM (
    SELECT user_id,
      CASE WHEN status = 'reserved' THEN reserved_budget_micro_kes
           WHEN status = 'uncertain' THEN GREATEST(reserved_budget_micro_kes, actual_budget_micro_kes)
           ELSE actual_budget_micro_kes END AS cost,
      (status IN ('reserved','uncertain') OR created_at >= day_start OR settled_at >= day_start) AS in_day,
      (status IN ('reserved','uncertain') OR created_at >= month_start OR settled_at >= month_start) AS in_month
    FROM public.atlas_usage_requests
    WHERE status IN ('reserved','uncertain') OR created_at >= month_start OR settled_at >= month_start
  ) accounted;

  IF individual_month + budget > monthly_limit THEN
    RETURN jsonb_build_object('reserved', false, 'reason', 'monthly_spending_limit');
  END IF;
  IF individual_day + budget > controls.individual_daily_budget_micro_kes
      OR global_day + budget > controls.global_daily_budget_micro_kes THEN
    RETURN jsonb_build_object('reserved', false, 'reason', 'spending_limit');
  END IF;

  result := public.atlas_reserve_request(_user_id, _request_id, _model, _credits, budget);
  IF result->>'reserved' = 'true' AND COALESCE(result->>'duplicate', 'false') = 'false' THEN
    INSERT INTO public.atlas_metering_snapshots(request_uuid, model, input_rate, cached_rate, output_rate,
      input_token_ceiling, output_token_ceiling, rate_source, rate_verified_until)
    VALUES ((result->>'request_uuid')::uuid, rate.model, rate.input_rate, rate.cached_rate, rate.output_rate,
      rate.input_token_ceiling, _max_output, rate.source, rate.verified_until);
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.atlas_reserve_metered_request(uuid,text,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atlas_reserve_metered_request(uuid,text,text,integer,integer) TO service_role;
