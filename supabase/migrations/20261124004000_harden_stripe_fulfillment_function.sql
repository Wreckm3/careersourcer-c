CREATE OR REPLACE FUNCTION public.fulfill_stripe_event(_event jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  event_id text := NULLIF(_event->>'event_id', '');
  event_type text := NULLIF(_event->>'event_type', '');
  event_kind text := _event->>'kind';
  event_time timestamptz;
  account_id uuid;
  plan public.subscription_tier;
  payment public.stripe_payment_records%ROWTYPE;
  existing public.subscriptions%ROWTYPE;
  subscription_ref text := NULLIF(_event->>'subscription_id', '');
  currency_code text := lower(NULLIF(_event->>'currency', ''));
  period_start_value timestamptz;
  period_end_value timestamptz;
  interval_count_value integer;
  inserted integer;
  matching_payments integer;
  is_new_payment boolean;
BEGIN
  IF event_id IS NULL OR event_type IS NULL
     OR event_kind NOT IN ('payment', 'subscription', 'refund', 'dispute', 'ignore')
     OR NULLIF(_event->>'event_created', '') IS NULL THEN
    RAISE EXCEPTION 'Invalid Stripe event';
  END IF;
  event_time := pg_catalog.to_timestamp((_event->>'event_created')::double precision);
  INSERT INTO public.payment_events (provider, provider_event_id, event_type, payload)
  VALUES ('stripe', event_id, event_type, COALESCE(_event->'raw_event', '{}'::jsonb))
  ON CONFLICT (provider, provider_event_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN RETURN 'duplicate'; END IF;
  IF event_kind = 'ignore' THEN RETURN 'processed'; END IF;

  IF event_kind IN ('payment', 'subscription') AND subscription_ref IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-sub:' || subscription_ref, 0));
    IF NULLIF(_event->>'user_id', '') IS NOT NULL THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-user:' || (_event->>'user_id'), 0));
    END IF;
  END IF;

  IF event_kind = 'payment' THEN
    IF _event->>'paid' IS DISTINCT FROM 'true'
       OR NULLIF(_event->>'invoice_id', '') IS NULL
       OR subscription_ref IS NULL
       OR NULLIF(_event->>'user_id', '') IS NULL
       OR _event->>'tier' NOT IN ('builder', 'professional', 'elite')
       OR NULLIF(_event->>'amount', '') IS NULL
       OR (_event->>'amount')::bigint <= 0
       OR currency_code IS NULL OR currency_code !~ '^[a-z]{3}$'
       OR _event->>'interval' IS DISTINCT FROM 'month'
       OR NULLIF(_event->>'period_start', '') IS NULL
       OR NULLIF(_event->>'period_end', '') IS NULL
       OR NULLIF(_event->>'interval_count', '') IS NULL THEN
      RAISE EXCEPTION 'Invalid verified Stripe payment';
    END IF;
    account_id := (_event->>'user_id')::uuid;
    plan := (_event->>'tier')::public.subscription_tier;
    period_start_value := (_event->>'period_start')::timestamptz;
    period_end_value := (_event->>'period_end')::timestamptz;
    interval_count_value := (_event->>'interval_count')::integer;
    IF period_end_value <= period_start_value OR interval_count_value NOT IN (1, 3) THEN
      RAISE EXCEPTION 'Invalid Stripe paid period';
    END IF;
    IF period_end_value IS DISTINCT FROM
       (period_start_value + (interval_count_value || ' month')::interval) THEN
      RAISE EXCEPTION 'Stripe paid period does not match configured interval';
    END IF;

    INSERT INTO public.stripe_payment_records
      (user_id, tier, invoice_id, subscription_id, customer_id, charge_id, payment_intent_id,
       amount_minor, currency, period_start, period_end, billing_interval, billing_interval_count, event_id)
    VALUES (account_id, plan, _event->>'invoice_id', subscription_ref, NULLIF(_event->>'customer_id', ''),
      NULLIF(_event->>'charge_id', ''), NULLIF(_event->>'payment_intent_id', ''),
      (_event->>'amount')::bigint, currency_code, period_start_value, period_end_value,
      'month', interval_count_value, event_id)
    ON CONFLICT (invoice_id) DO NOTHING;
    GET DIAGNOSTICS inserted = ROW_COUNT;
    is_new_payment := inserted = 1;
    SELECT * INTO payment FROM public.stripe_payment_records WHERE invoice_id = _event->>'invoice_id' FOR UPDATE;
    IF payment.user_id <> account_id OR payment.tier <> plan
       OR payment.subscription_id <> subscription_ref
       OR payment.amount_minor <> (_event->>'amount')::bigint
       OR payment.currency <> currency_code
       OR payment.period_start <> period_start_value
       OR payment.period_end <> period_end_value
       OR payment.billing_interval_count <> interval_count_value THEN
      RAISE EXCEPTION 'Stripe invoice conflicts with existing fulfillment';
    END IF;
    UPDATE public.stripe_payment_records SET
      charge_id = COALESCE(charge_id, NULLIF(_event->>'charge_id', '')),
      payment_intent_id = COALESCE(payment_intent_id, NULLIF(_event->>'payment_intent_id', ''))
    WHERE id = payment.id
      AND (charge_id IS NULL OR charge_id = NULLIF(_event->>'charge_id', '') OR NULLIF(_event->>'charge_id', '') IS NULL)
      AND (payment_intent_id IS NULL OR payment_intent_id = NULLIF(_event->>'payment_intent_id', '') OR NULLIF(_event->>'payment_intent_id', '') IS NULL);
    IF NOT FOUND THEN RAISE EXCEPTION 'Stripe payment reference conflict'; END IF;
    IF NOT is_new_payment THEN RETURN 'processed'; END IF;

    IF EXISTS (
      SELECT 1 FROM public.stripe_subscription_revocations
      WHERE subscription_id = subscription_ref AND user_id <> account_id
    ) THEN RAISE EXCEPTION 'Stripe subscription owner conflict'; END IF;

    SELECT * INTO existing FROM public.subscriptions WHERE user_id = account_id FOR UPDATE;
    IF FOUND AND existing.provider IS NOT NULL AND existing.provider <> 'stripe'
       AND existing.status IN ('active', 'trialing')
       AND (existing.current_period_end IS NULL OR existing.current_period_end > pg_catalog.now()) THEN
      RAISE EXCEPTION 'Active subscription uses another provider';
    END IF;

    INSERT INTO public.subscriptions
      (user_id, tier, status, provider, provider_customer_id, provider_subscription_id,
       current_period_start, current_period_end, billing_interval, billing_interval_count,
       stripe_event_created_at, cancel_at_period_end)
    SELECT account_id, plan, 'active', 'stripe', NULLIF(_event->>'customer_id', ''),
      subscription_ref, period_start_value, period_end_value, 'month', interval_count_value,
      event_time, false
    WHERE NOT EXISTS (
      SELECT 1 FROM public.stripe_subscription_revocations r
      WHERE r.subscription_id = subscription_ref
        AND r.provider_created_at >= event_time
    )
    ON CONFLICT (user_id) DO UPDATE SET
      tier = EXCLUDED.tier,
      status = 'active',
      provider = 'stripe',
      provider_customer_id = EXCLUDED.provider_customer_id,
      provider_subscription_id = EXCLUDED.provider_subscription_id,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      billing_interval = EXCLUDED.billing_interval,
      billing_interval_count = EXCLUDED.billing_interval_count,
      stripe_event_created_at = EXCLUDED.stripe_event_created_at,
      cancel_at_period_end = CASE
        WHEN public.subscriptions.provider_subscription_id = subscription_ref
        THEN public.subscriptions.cancel_at_period_end ELSE false END
    WHERE (public.subscriptions.stripe_event_created_at IS NULL
           OR public.subscriptions.stripe_event_created_at < event_time)
      AND (public.subscriptions.current_period_end IS NULL
           OR public.subscriptions.current_period_end <= period_end_value);

  ELSIF event_kind = 'subscription' THEN
    IF subscription_ref IS NULL OR NULLIF(_event->>'user_id', '') IS NULL THEN
      RAISE EXCEPTION 'Invalid Stripe subscription event';
    END IF;
    IF _event->>'status' IN ('canceled', 'past_due', 'expired', 'unpaid', 'incomplete_expired', 'incomplete') THEN
      INSERT INTO public.stripe_subscription_revocations
        (subscription_id, user_id, provider_created_at, status)
      VALUES (subscription_ref, (_event->>'user_id')::uuid, event_time,
        CASE WHEN _event->>'status' IN ('canceled', 'expired', 'unpaid', 'incomplete_expired')
             THEN 'canceled'::public.subscription_status ELSE 'past_due'::public.subscription_status END)
      ON CONFLICT (subscription_id) DO UPDATE SET
        provider_created_at = GREATEST(public.stripe_subscription_revocations.provider_created_at, EXCLUDED.provider_created_at),
        status = CASE
          WHEN EXCLUDED.status = 'canceled' THEN 'canceled'
          WHEN public.stripe_subscription_revocations.status = 'canceled' THEN 'canceled'
          ELSE EXCLUDED.status END
      WHERE public.stripe_subscription_revocations.user_id = EXCLUDED.user_id;
      IF EXISTS (
        SELECT 1 FROM public.stripe_subscription_revocations
        WHERE subscription_id = subscription_ref
          AND user_id <> (_event->>'user_id')::uuid
      ) THEN RAISE EXCEPTION 'Stripe subscription owner conflict'; END IF;
      UPDATE public.subscriptions SET
        status = CASE
          WHEN _event->>'status' IN ('canceled', 'expired', 'unpaid', 'incomplete_expired')
          THEN 'canceled'::public.subscription_status ELSE 'past_due'::public.subscription_status END,
        stripe_event_created_at = event_time
      WHERE user_id = (_event->>'user_id')::uuid
        AND provider = 'stripe'
        AND provider_subscription_id = subscription_ref
        AND (stripe_event_created_at IS NULL OR stripe_event_created_at <= event_time);
    ELSIF _event->>'status' IN ('active', 'trialing') THEN
      UPDATE public.subscriptions SET
        status = (_event->>'status')::public.subscription_status,
        stripe_event_created_at = event_time
      WHERE user_id = (_event->>'user_id')::uuid
        AND provider = 'stripe'
        AND provider_subscription_id = subscription_ref
        AND (stripe_event_created_at IS NULL OR stripe_event_created_at <= event_time)
        AND (current_period_end IS NULL OR current_period_end > pg_catalog.now());
    ELSIF _event ? 'cancel_at_period_end' AND pg_catalog.jsonb_typeof(_event->'cancel_at_period_end') = 'boolean' THEN
      UPDATE public.subscriptions SET cancel_at_period_end = (_event->>'cancel_at_period_end')::boolean
      WHERE user_id = (_event->>'user_id')::uuid
        AND provider = 'stripe'
        AND provider_subscription_id = subscription_ref
        AND (stripe_event_created_at IS NULL OR stripe_event_created_at <= event_time);
    END IF;

  ELSE
    IF currency_code IS NULL OR currency_code !~ '^[a-z]{3}$'
       OR NULLIF(_event->>'amount', '') IS NULL
       OR (_event->>'amount')::bigint < 0 THEN
      RAISE EXCEPTION 'Invalid Stripe adjustment';
    END IF;
    SELECT count(*) INTO matching_payments
    FROM public.stripe_payment_records
    WHERE (NULLIF(_event->>'invoice_id', '') IS NOT NULL AND invoice_id = _event->>'invoice_id')
       OR (NULLIF(_event->>'charge_id', '') IS NOT NULL AND charge_id = _event->>'charge_id')
       OR (NULLIF(_event->>'payment_intent_id', '') IS NOT NULL AND payment_intent_id = _event->>'payment_intent_id');
    IF matching_payments <> 1 THEN RAISE EXCEPTION 'Stripe adjustment payment not found or conflicting'; END IF;
    SELECT * INTO payment FROM public.stripe_payment_records
      WHERE (NULLIF(_event->>'invoice_id', '') IS NOT NULL AND invoice_id = _event->>'invoice_id')
         OR (NULLIF(_event->>'charge_id', '') IS NOT NULL AND charge_id = _event->>'charge_id')
         OR (NULLIF(_event->>'payment_intent_id', '') IS NOT NULL AND payment_intent_id = _event->>'payment_intent_id')
      FOR UPDATE;
    IF payment.currency <> currency_code
       OR (_event->>'amount')::bigint > payment.amount_minor
       OR (NULLIF(_event->>'invoice_id', '') IS NOT NULL AND payment.invoice_id <> _event->>'invoice_id')
       OR (NULLIF(_event->>'charge_id', '') IS NOT NULL AND payment.charge_id IS DISTINCT FROM _event->>'charge_id')
       OR (NULLIF(_event->>'payment_intent_id', '') IS NOT NULL AND payment.payment_intent_id IS DISTINCT FROM _event->>'payment_intent_id') THEN
      RAISE EXCEPTION 'Stripe adjustment conflicts with payment';
    END IF;
    INSERT INTO public.stripe_payment_adjustments
      (event_id, payment_id, kind, amount_minor, currency, refund_id, dispute_id, status, reason, provider_created_at)
    VALUES (event_id, payment.id, event_kind, (_event->>'amount')::bigint, currency_code,
      NULLIF(_event->>'refund_id', ''), NULLIF(_event->>'dispute_id', ''),
      NULLIF(_event->>'status', ''), NULLIF(_event->>'reason', ''), event_time);
  END IF;
  RETURN 'processed';
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_stripe_event(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_stripe_event(jsonb) TO service_role;
