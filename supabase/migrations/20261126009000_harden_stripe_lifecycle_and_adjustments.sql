-- Stripe lifecycle notifications are not proof of payment. Preserve the
-- existing signed-event fulfillment contract behind a private implementation.
ALTER FUNCTION public.fulfill_stripe_event(jsonb) RENAME TO atlas_fulfill_stripe_event_v1;
REVOKE ALL ON FUNCTION public.atlas_fulfill_stripe_event_v1(jsonb) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.fulfill_stripe_event(_event jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  normalized jsonb := _event;
  p public.stripe_payment_records%ROWTYPE;
  lifecycle_status text := _event->>'status';
BEGIN
  IF _event->>'kind' = 'subscription' THEN
    IF lifecycle_status IS NULL OR lifecycle_status NOT IN ('active','trialing','past_due','canceled','unpaid','expired','incomplete','incomplete_expired','paused') THEN
      RAISE EXCEPTION 'Invalid Stripe subscription status';
    END IF;
    IF lifecycle_status IN ('active','trialing') THEN
      -- A lifecycle message can change cancellation metadata but cannot
      -- restore a revoked entitlement. A newly verified invoice can do so.
      normalized := jsonb_set(normalized, '{status}', '"metadata_only"'::jsonb);
    ELSIF lifecycle_status = 'paused' THEN
      normalized := jsonb_set(normalized, '{status}', '"past_due"'::jsonb);
    END IF;
  ELSIF _event->>'kind' IN ('refund','dispute') THEN
    -- Acquire the same advisory locks as invoice fulfillment BEFORE the
    -- existing implementation takes payment/subscription row locks.
    SELECT * INTO p FROM public.stripe_payment_records
    WHERE (NULLIF(_event->>'invoice_id','') IS NOT NULL AND invoice_id=_event->>'invoice_id')
       OR (NULLIF(_event->>'charge_id','') IS NOT NULL AND charge_id=_event->>'charge_id')
       OR (NULLIF(_event->>'payment_intent_id','') IS NOT NULL AND payment_intent_id=_event->>'payment_intent_id')
    ORDER BY id LIMIT 1;
    IF FOUND THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-sub:'||p.subscription_id,0));
      PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-user:'||p.user_id::text,0));
    END IF;
  END IF;
  RETURN public.atlas_fulfill_stripe_event_v1(normalized);
END;
$$;
REVOKE ALL ON FUNCTION public.fulfill_stripe_event(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_stripe_event(jsonb) TO service_role;

-- Always reconcile historical adjustments in the payment ledger. Only the
-- matching currently recorded paid period may have its entitlement changed.
CREATE OR REPLACE FUNCTION public.reconcile_stripe_adjustment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  payment public.stripe_payment_records%ROWTYPE;
  existing public.subscriptions%ROWTYPE;
  refund_total numeric;
  dispute_open bigint;
  dispute_lost bigint;
  dispute_state text;
  target_status public.subscription_status;
BEGIN
  SELECT * INTO payment FROM public.stripe_payment_records WHERE id=NEW.payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stripe adjustment payment not found'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-sub:'||payment.subscription_id,0));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-user:'||payment.user_id::text,0));
  SELECT * INTO payment FROM public.stripe_payment_records WHERE id=NEW.payment_id FOR UPDATE;
  IF NOT FOUND OR NEW.currency IS DISTINCT FROM payment.currency OR NEW.amount_minor > payment.amount_minor THEN
    RAISE EXCEPTION 'Stripe adjustment conflicts with payment';
  END IF;

  IF NEW.kind='refund' THEN
    IF NEW.refund_id IS NULL THEN RAISE EXCEPTION 'Stripe successful refund requires refund ID'; END IF;
    INSERT INTO public.stripe_refund_reconciliation(refund_id,payment_id,amount_minor,currency,event_id,provider_created_at)
      VALUES(NEW.refund_id,NEW.payment_id,NEW.amount_minor,NEW.currency,NEW.event_id,NEW.provider_created_at)
      ON CONFLICT(refund_id) DO NOTHING;
    IF NOT EXISTS (SELECT 1 FROM public.stripe_refund_reconciliation r WHERE r.refund_id=NEW.refund_id
      AND r.payment_id=NEW.payment_id AND r.amount_minor=NEW.amount_minor AND r.currency=NEW.currency) THEN
      RAISE EXCEPTION 'Stripe refund conflicts with existing reconciliation';
    END IF;
  ELSE
    IF NEW.dispute_id IS NULL THEN RAISE EXCEPTION 'Stripe dispute requires dispute ID'; END IF;
    dispute_state := CASE
      WHEN NEW.status IN ('needs_response','warning_needs_response','under_review','warning_under_review','open') THEN 'open'
      WHEN NEW.status='won' THEN 'won'
      WHEN NEW.status IN ('lost','charge_refunded') THEN 'lost'
      ELSE NULL END;
    IF dispute_state IS NULL THEN RAISE EXCEPTION 'Invalid Stripe dispute status'; END IF;
    INSERT INTO public.stripe_dispute_reconciliation(dispute_id,payment_id,amount_minor,currency,status,event_id,provider_created_at)
      VALUES(NEW.dispute_id,NEW.payment_id,NEW.amount_minor,NEW.currency,dispute_state,NEW.event_id,NEW.provider_created_at)
      ON CONFLICT(dispute_id) DO UPDATE SET status=EXCLUDED.status, amount_minor=EXCLUDED.amount_minor,
        event_id=EXCLUDED.event_id, provider_created_at=EXCLUDED.provider_created_at
      WHERE public.stripe_dispute_reconciliation.payment_id=EXCLUDED.payment_id
        AND public.stripe_dispute_reconciliation.currency=EXCLUDED.currency
        AND (EXCLUDED.provider_created_at > public.stripe_dispute_reconciliation.provider_created_at
          OR (EXCLUDED.provider_created_at = public.stripe_dispute_reconciliation.provider_created_at
            AND ((public.stripe_dispute_reconciliation.status='open' AND EXCLUDED.status IN ('won','lost'))
              OR (public.stripe_dispute_reconciliation.status='won' AND EXCLUDED.status='lost'))));
    IF NOT EXISTS (SELECT 1 FROM public.stripe_dispute_reconciliation d WHERE d.dispute_id=NEW.dispute_id
      AND d.payment_id=NEW.payment_id AND d.currency=NEW.currency) THEN
      RAISE EXCEPTION 'Stripe dispute conflicts with existing reconciliation';
    END IF;
  END IF;

  SELECT COALESCE(sum(amount_minor),0) INTO refund_total FROM public.stripe_refund_reconciliation WHERE payment_id=payment.id;
  SELECT count(*) FILTER (WHERE status='open'), count(*) FILTER (WHERE status='lost')
    INTO dispute_open,dispute_lost FROM public.stripe_dispute_reconciliation WHERE payment_id=payment.id;
  UPDATE public.stripe_payment_records SET refunded_minor=LEAST(refund_total,payment.amount_minor)::bigint,
    reconciliation_status=CASE WHEN refund_total>payment.amount_minor OR (refund_total>0 AND dispute_open>0) THEN 'refund_dispute_overlap'
      WHEN refund_total>=payment.amount_minor THEN 'full_refund' WHEN refund_total>0 THEN 'partial_refund' ELSE 'none' END
    WHERE id=payment.id;

  SELECT * INTO existing FROM public.subscriptions WHERE user_id=payment.user_id FOR UPDATE;
  IF NOT FOUND OR existing.provider IS DISTINCT FROM 'stripe'
    OR existing.provider_subscription_id IS DISTINCT FROM payment.subscription_id
    OR existing.current_period_start IS DISTINCT FROM payment.period_start
    OR existing.current_period_end IS DISTINCT FROM payment.period_end THEN
    RETURN NULL;
  END IF;
  IF refund_total>=payment.amount_minor OR dispute_lost>0 THEN
    target_status := 'canceled';
  ELSIF dispute_open>0 THEN
    target_status := CASE WHEN existing.status='canceled' THEN 'canceled'::public.subscription_status ELSE 'past_due'::public.subscription_status END;
  ELSE
    -- Partial refunds and won disputes do not prove that all other entitlement
    -- restrictions are cleared. Keep the current status; restoration requires
    -- a new verified invoice or a separate operator review.
    RETURN NULL;
  END IF;
  INSERT INTO public.stripe_subscription_revocations(subscription_id,user_id,provider_created_at,status)
    VALUES(payment.subscription_id,payment.user_id,NEW.provider_created_at,target_status)
    ON CONFLICT(subscription_id) DO UPDATE SET provider_created_at=GREATEST(public.stripe_subscription_revocations.provider_created_at,EXCLUDED.provider_created_at),
      status=CASE WHEN public.stripe_subscription_revocations.status='canceled' OR EXCLUDED.status='canceled' THEN 'canceled'::public.subscription_status ELSE EXCLUDED.status END
    WHERE public.stripe_subscription_revocations.user_id=EXCLUDED.user_id;
  UPDATE public.subscriptions SET status=target_status,
    stripe_event_created_at=GREATEST(stripe_event_created_at,NEW.provider_created_at)
    WHERE user_id=payment.user_id AND provider='stripe' AND provider_subscription_id=payment.subscription_id;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_stripe_adjustment() FROM PUBLIC, anon, authenticated;
