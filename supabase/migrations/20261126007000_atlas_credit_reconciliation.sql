-- Manual, evidence-backed recovery for unresolved metered requests.
-- A timeout alone is NOT evidence of zero provider cost or non-delivery.
CREATE TABLE public.atlas_request_reconciliations (
  request_uuid uuid PRIMARY KEY REFERENCES public.atlas_usage_requests(id) ON DELETE CASCADE,
  outcome text NOT NULL CHECK (outcome IN ('no_charge','priced')),
  evidence_reference text NOT NULL CHECK (length(btrim(evidence_reference)) BETWEEN 1 AND 500),
  refund_credits boolean NOT NULL,
  credits_restored integer NOT NULL CHECK (credits_restored >= 0),
  expired_subscription_credits integer NOT NULL CHECK (expired_subscription_credits >= 0),
  provider_cost_micro_kes bigint NOT NULL CHECK (provider_cost_micro_kes >= 0),
  reconciled_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atlas_request_reconciliations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atlas_request_reconciliations FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.atlas_request_reconciliations TO service_role;

-- Only a trusted backend/operator can call this after independently verifying
-- provider records and, when refunding, determining that delivery failed.
-- Evidence references should be opaque ticket/record IDs, never secrets or prompts.
CREATE FUNCTION public.atlas_reconcile_metered_request(
  _request_uuid uuid, _outcome text, _refund_credits boolean, _evidence_reference text,
  _input integer DEFAULT NULL, _cached integer DEFAULT NULL, _output integer DEFAULT NULL,
  _response_id text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  account_id uuid;
  snapshot public.atlas_metering_snapshots%ROWTYPE;
  req public.atlas_usage_requests%ROWTYPE;
  wallet public.atlas_credit_wallets%ROWTYPE;
  amount bigint := 0;
  restored integer := 0;
  expired integer := 0;
  p integer := 0;
  b integer := 0;
  f integer := 0;
  r integer := 0;
  reconciliation_label text;
BEGIN
  IF _request_uuid IS NULL OR _outcome IS NULL OR _outcome NOT IN ('no_charge','priced')
     OR _refund_credits IS NULL OR _evidence_reference IS NULL
     OR length(btrim(_evidence_reference)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'INVALID_RECONCILIATION';
  END IF;
  IF _outcome = 'no_charge' AND (NOT _refund_credits OR _input IS NOT NULL OR _cached IS NOT NULL
     OR _output IS NOT NULL OR _response_id IS NOT NULL) THEN
    RAISE EXCEPTION 'INVALID_NO_CHARGE_RECONCILIATION';
  END IF;
  IF _outcome = 'priced' AND (_input IS NULL OR _cached IS NULL OR _output IS NULL
     OR _input NOT BETWEEN 0 AND 2000000 OR _cached NOT BETWEEN 0 AND _input
     OR _output NOT BETWEEN 0 AND 2000000 OR _response_id IS NULL
     OR length(btrim(_response_id)) NOT BETWEEN 1 AND 200) THEN
    RAISE EXCEPTION 'INVALID_VERIFIED_USAGE';
  END IF;

  SELECT user_id INTO account_id FROM public.atlas_usage_requests WHERE id = _request_uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'METERED_REQUEST_NOT_FOUND'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('atlas-wallet:' || account_id::text, 0));
  -- Match live metered settlement's snapshot -> request lock ordering.
  SELECT * INTO snapshot FROM public.atlas_metering_snapshots WHERE request_uuid = _request_uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'METERING_SNAPSHOT_REQUIRED'; END IF;
  SELECT * INTO req FROM public.atlas_usage_requests WHERE id = _request_uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'METERED_REQUEST_NOT_FOUND'; END IF;
  IF req.status NOT IN ('reserved','uncertain') THEN
    RETURN jsonb_build_object('reconciled', false, 'reason', 'already_final', 'status', req.status);
  END IF;
  IF req.created_at > pg_catalog.now() - interval '10 minutes' THEN
    RETURN jsonb_build_object('reconciled', false, 'reason', 'request_not_stale');
  END IF;

  IF _outcome = 'priced' THEN
    amount := ceil(((_input - _cached)::numeric * snapshot.input_rate + _cached::numeric * snapshot.cached_rate
       + _output::numeric * snapshot.output_rate) / 1000000)::bigint;
    reconciliation_label := CASE WHEN amount > req.reserved_budget_micro_kes OR _input > snapshot.input_token_ceiling
       OR _output > snapshot.output_token_ceiling THEN 'provider_usage_overrun' ELSE 'provider_usage_priced' END;
    -- The unique provider response ID prevents accounting for one response twice.
    UPDATE public.atlas_metering_snapshots SET provider_response_id = _response_id, priced_at = pg_catalog.now()
      WHERE request_uuid = _request_uuid;
  ELSE
    reconciliation_label := 'operator_verified_no_charge';
  END IF;

  IF _refund_credits THEN
    SELECT * INTO wallet FROM public.atlas_credit_wallets WHERE user_id = account_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'WALLET_UNAVAILABLE'; END IF;
    -- Purchased and promotional balances survive subscription renewal.
    -- Do not replenish expired subscription allowances in the new period.
    p := req.reserved_promotional;
    b := req.reserved_purchased;
    IF wallet.period_key = req.period_key THEN
      f := req.reserved_flexible;
      r := req.reserved_reserve;
    ELSE
      expired := req.reserved_flexible + req.reserved_reserve;
    END IF;
    restored := p + b + f + r;
    UPDATE public.atlas_credit_wallets SET
      promotional_balance = promotional_balance + p,
      purchased_balance = purchased_balance + b,
      flexible_balance = flexible_balance + f,
      reserve_balance = reserve_balance + r,
      essential_mode = CASE WHEN flexible_balance + f > 0 THEN false ELSE essential_mode END,
      updated_at = pg_catalog.now()
    WHERE user_id = account_id;
    INSERT INTO public.atlas_credit_ledger(user_id, period_key, bucket, delta, reason, reference_type, reference_id)
      SELECT account_id, wallet.period_key, v.bucket, v.delta, 'Verified Atlas reconciliation refund',
        'atlas_reconciliation', _request_uuid::text
      FROM (VALUES ('promotional',p),('purchased',b),('flexible',f),('reserve',r)) v(bucket,delta)
      WHERE v.delta > 0;
  END IF;

  UPDATE public.atlas_usage_requests SET
    status = CASE WHEN _outcome = 'no_charge' THEN 'failed' ELSE 'settled' END,
    actual_credits = CASE WHEN _refund_credits THEN 0 ELSE req.reserved_credits END,
    actual_budget_micro_kes = amount,
    input_tokens = COALESCE(_input,0), cached_tokens = COALESCE(_cached,0), output_tokens = COALESCE(_output,0),
    reconciliation = reconciliation_label, settled_at = pg_catalog.now()
  WHERE id = _request_uuid;
  INSERT INTO public.atlas_request_reconciliations(request_uuid,outcome,evidence_reference,refund_credits,
    credits_restored,expired_subscription_credits,provider_cost_micro_kes)
    VALUES (_request_uuid,_outcome,btrim(_evidence_reference),_refund_credits,restored,expired,amount);
  RETURN jsonb_build_object('reconciled',true,'credits_restored',restored,
    'expired_subscription_credits',expired,'provider_cost_micro_kes',amount::text);
END;
$$;
REVOKE ALL ON FUNCTION public.atlas_reconcile_metered_request(uuid,text,boolean,text,integer,integer,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atlas_reconcile_metered_request(uuid,text,boolean,text,integer,integer,integer,text) TO service_role;
