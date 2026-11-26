-- Explicit operator-verified rates, in micro-KES per one million tokens.
-- No rates are seeded: paid generation fails closed until a rate is verified.
CREATE TABLE public.atlas_verified_metering_rates (
  model text PRIMARY KEY CHECK (length(model) BETWEEN 1 AND 120),
  input_rate bigint NOT NULL CHECK (input_rate > 0 AND input_rate <= 1000000000000),
  cached_rate bigint NOT NULL CHECK (cached_rate >= 0 AND cached_rate <= input_rate),
  output_rate bigint NOT NULL CHECK (output_rate > 0 AND output_rate <= 1000000000000),
  input_token_ceiling integer NOT NULL CHECK (input_token_ceiling BETWEEN 1024 AND 2000000),
  verified_until timestamptz NOT NULL,
  source text NOT NULL CHECK (length(btrim(source)) BETWEEN 1 AND 500)
);
CREATE TABLE public.atlas_metering_snapshots (
  request_uuid uuid PRIMARY KEY REFERENCES public.atlas_usage_requests(id) ON DELETE CASCADE,
  model text NOT NULL,
  input_rate bigint NOT NULL,
  cached_rate bigint NOT NULL,
  output_rate bigint NOT NULL,
  input_token_ceiling integer NOT NULL,
  output_token_ceiling integer NOT NULL,
  rate_source text NOT NULL,
  rate_verified_until timestamptz NOT NULL,
  provider_response_id text UNIQUE,
  priced_at timestamptz
);
ALTER TABLE public.atlas_verified_metering_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_metering_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atlas_verified_metering_rates, public.atlas_metering_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atlas_verified_metering_rates, public.atlas_metering_snapshots TO service_role;

CREATE FUNCTION public.atlas_reserve_metered_request(
  _user_id uuid, _request_id text, _model text, _credits integer, _max_output integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rate public.atlas_verified_metering_rates%ROWTYPE;
  result jsonb;
  budget bigint;
BEGIN
  IF _max_output IS NULL OR _max_output NOT BETWEEN 1 AND 16000 OR _credits IS NULL OR _credits <= 0 THEN
    RAISE EXCEPTION 'INVALID_METERED_REQUEST';
  END IF;
  SELECT * INTO rate FROM public.atlas_verified_metering_rates WHERE model = _model AND verified_until > now();
  IF NOT FOUND THEN RETURN jsonb_build_object('reserved', false, 'reason', 'pricing_unavailable'); END IF;
  -- Reserve the entire verified model input ceiling, not a character-count guess.
  budget := ceil((rate.input_rate::numeric * rate.input_token_ceiling + rate.output_rate::numeric * _max_output) / 1000000)::bigint;
  result := public.atlas_reserve_request(_user_id, _request_id, _model, _credits, budget);
  IF result->>'reserved' = 'true' AND COALESCE(result->>'duplicate', 'false') = 'false' THEN
    INSERT INTO public.atlas_metering_snapshots(request_uuid, model, input_rate, cached_rate, output_rate, input_token_ceiling, output_token_ceiling, rate_source, rate_verified_until)
    VALUES ((result->>'request_uuid')::uuid, rate.model, rate.input_rate, rate.cached_rate, rate.output_rate, rate.input_token_ceiling, _max_output, rate.source, rate.verified_until);
  END IF;
  RETURN result;
END;
$$;

CREATE FUNCTION public.atlas_settle_metered_request(
  _request_uuid uuid, _dispatched boolean, _input integer, _cached integer, _output integer, _response_id text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  snapshot public.atlas_metering_snapshots%ROWTYPE;
  request public.atlas_usage_requests%ROWTYPE;
  amount bigint;
  result jsonb;
BEGIN
  SELECT * INTO snapshot FROM public.atlas_metering_snapshots WHERE request_uuid = _request_uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'METERING_SNAPSHOT_REQUIRED'; END IF;
  SELECT * INTO request FROM public.atlas_usage_requests WHERE id = _request_uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'METERED_REQUEST_NOT_FOUND'; END IF;
  IF request.status <> 'reserved' THEN RETURN jsonb_build_object('settled', true, 'duplicate', true, 'status', request.status); END IF;
  IF _dispatched IS FALSE THEN
    RETURN public.atlas_settle_request(_request_uuid, 'failed', 0, 0, 0, 0, 0, 'not_dispatched');
  END IF;
  IF _input IS NULL OR _cached IS NULL OR _output IS NULL OR _input < 0 OR _cached < 0 OR _output < 0
    OR _cached > _input OR _input > 2000000 OR _output > 2000000
    OR _response_id IS NULL OR length(_response_id) NOT BETWEEN 1 AND 200 THEN
    RETURN public.atlas_settle_request(_request_uuid, 'uncertain', 0, 0, 0, 0, 0, 'provider_usage_missing');
  END IF;
  amount := ceil(((_input - _cached)::numeric * snapshot.input_rate + _cached::numeric * snapshot.cached_rate + _output::numeric * snapshot.output_rate) / 1000000)::bigint;
  -- Product credits are deliberately fixed per routed request, independent of cash cost.
  result := public.atlas_settle_request(_request_uuid, 'settled', request.reserved_credits, amount,
    _input, _output, _cached, CASE WHEN amount > request.reserved_budget_micro_kes OR _input > snapshot.input_token_ceiling OR _output > snapshot.output_token_ceiling
      THEN 'provider_usage_overrun' ELSE 'provider_usage_priced' END);
  UPDATE public.atlas_metering_snapshots SET provider_response_id = _response_id, priced_at = now() WHERE request_uuid = _request_uuid;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.atlas_reserve_metered_request(uuid,text,text,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.atlas_settle_metered_request(uuid,boolean,integer,integer,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atlas_reserve_metered_request(uuid,text,text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.atlas_settle_metered_request(uuid,boolean,integer,integer,integer,text) TO service_role;

-- Separate token-priced accounting from legacy estimates; never imply invoice reconciliation.
CREATE OR REPLACE FUNCTION public.atlas_founder_control_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  controls public.atlas_financial_controls%ROWTYPE;
  usage_summary jsonb;
  day_start timestamptz := date_trunc('day', now());
  month_start timestamptz := date_trunc('month', now());
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.atlas_founder_operators WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ATLAS_OPERATOR_REQUIRED';
  END IF;
  SELECT * INTO controls FROM public.atlas_financial_controls WHERE id = 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Atlas financial controls unavailable'; END IF;

  -- Match the existing reservation budget accounting. These are internal
  -- estimated amounts, not invoice-verified provider costs or revenue.
  SELECT jsonb_build_object(
    'daily_accounted_micro_kes', COALESCE(sum(CASE WHEN status = 'reserved' THEN reserved_budget_micro_kes ELSE actual_budget_micro_kes END) FILTER (WHERE created_at >= day_start), 0)::text,
    'monthly_accounted_micro_kes', COALESCE(sum(CASE WHEN status = 'reserved' THEN reserved_budget_micro_kes ELSE actual_budget_micro_kes END) FILTER (WHERE created_at >= month_start), 0)::text,
    'monthly_settled_estimate_micro_kes', COALESCE(sum(actual_budget_micro_kes) FILTER (WHERE created_at >= month_start AND status = 'settled'), 0)::text,
    'monthly_priced_micro_kes', COALESCE(sum(actual_budget_micro_kes) FILTER (WHERE created_at >= month_start AND status = 'settled' AND reconciliation IN ('provider_usage_priced','provider_usage_overrun')), 0)::text,
    'monthly_legacy_estimate_micro_kes', COALESCE(sum(actual_budget_micro_kes) FILTER (WHERE created_at >= month_start AND status = 'settled' AND reconciliation NOT IN ('provider_usage_priced','provider_usage_overrun')), 0)::text,
    'monthly_overrun_count', count(*) FILTER (WHERE created_at >= month_start AND reconciliation = 'provider_usage_overrun'),
    'outstanding_micro_kes', COALESCE(sum(CASE WHEN status = 'reserved' THEN reserved_budget_micro_kes ELSE GREATEST(reserved_budget_micro_kes, actual_budget_micro_kes) END) FILTER (WHERE status IN ('reserved','uncertain')), 0)::text,
    'reserved_count', count(*) FILTER (WHERE status = 'reserved'),
    'uncertain_count', count(*) FILTER (WHERE status = 'uncertain'),
    'monthly_requests', count(*) FILTER (WHERE created_at >= month_start),
    'monthly_failed_count', count(*) FILTER (WHERE created_at >= month_start AND status = 'failed'),
    'monthly_settled_credits', COALESCE(sum(actual_credits) FILTER (WHERE created_at >= month_start AND status = 'settled'), 0)::text
  ) INTO usage_summary
  FROM public.atlas_usage_requests
  WHERE created_at >= month_start OR status IN ('reserved','uncertain');

  RETURN usage_summary || jsonb_build_object(
    'emergency_shutdown', controls.emergency_shutdown,
    'global_daily_budget_micro_kes', controls.global_daily_budget_micro_kes::text,
    'individual_daily_budget_micro_kes', controls.individual_daily_budget_micro_kes::text,
    'timezone', current_setting('TimeZone'),
    'captured_at', now(),
    'last_pause_at', (SELECT max(created_at) FROM public.atlas_founder_control_events WHERE action = 'pause_generation')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.atlas_founder_control_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atlas_founder_control_snapshot() TO authenticated;
