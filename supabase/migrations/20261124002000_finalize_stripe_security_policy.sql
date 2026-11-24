CREATE OR REPLACE FUNCTION public.reconcile_stripe_adjustment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  payment public.stripe_payment_records%ROWTYPE;
  existing public.subscriptions%ROWTYPE;
  refund_total bigint;
  dispute_open integer;
  dispute_lost integer;
  target_status public.subscription_status;
BEGIN
  SELECT * INTO payment FROM public.stripe_payment_records WHERE id = NEW.payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stripe adjustment payment not found'; END IF;
  IF NEW.currency IS DISTINCT FROM payment.currency THEN
    RAISE EXCEPTION 'Stripe adjustment currency conflict';
  END IF;
  SELECT * INTO existing FROM public.subscriptions WHERE user_id = payment.user_id FOR UPDATE;
  IF FOUND
     AND existing.provider = 'stripe'
     AND existing.provider_subscription_id = payment.subscription_id
     AND (
       (existing.stripe_event_created_at IS NOT NULL
        AND existing.stripe_event_created_at > NEW.provider_created_at)
       OR (existing.current_period_end IS NOT NULL
           AND existing.current_period_end > payment.period_end)
     ) THEN
    RETURN NULL;
  END IF;

  IF NEW.kind = 'refund' THEN
    IF NEW.refund_id IS NULL THEN
      RAISE EXCEPTION 'Stripe successful refund requires refund ID';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.stripe_refund_reconciliation
      WHERE refund_id = NEW.refund_id
        AND (payment_id IS DISTINCT FROM NEW.payment_id
             OR amount_minor IS DISTINCT FROM NEW.amount_minor
             OR currency IS DISTINCT FROM NEW.currency)
    ) THEN RAISE EXCEPTION 'Stripe refund conflicts with existing reconciliation'; END IF;
    INSERT INTO public.stripe_refund_reconciliation
      (refund_id, payment_id, amount_minor, currency, event_id, provider_created_at)
    VALUES (NEW.refund_id, NEW.payment_id, NEW.amount_minor, NEW.currency, NEW.event_id, NEW.provider_created_at)
    ON CONFLICT (refund_id) DO UPDATE SET
      payment_id = EXCLUDED.payment_id,
      amount_minor = EXCLUDED.amount_minor,
      currency = EXCLUDED.currency,
      event_id = CASE WHEN public.stripe_refund_reconciliation.event_id < EXCLUDED.event_id
        THEN EXCLUDED.event_id ELSE public.stripe_refund_reconciliation.event_id END
    WHERE public.stripe_refund_reconciliation.payment_id = EXCLUDED.payment_id
      AND public.stripe_refund_reconciliation.amount_minor = EXCLUDED.amount_minor
      AND public.stripe_refund_reconciliation.currency = EXCLUDED.currency;
  ELSE
    IF NEW.dispute_id IS NULL THEN RAISE EXCEPTION 'Stripe dispute requires dispute ID'; END IF;
    IF EXISTS (
      SELECT 1 FROM public.stripe_dispute_reconciliation
      WHERE dispute_id = NEW.dispute_id
        AND (payment_id IS DISTINCT FROM NEW.payment_id
             OR currency IS DISTINCT FROM NEW.currency)
    ) THEN RAISE EXCEPTION 'Stripe dispute conflicts with existing reconciliation'; END IF;
    INSERT INTO public.stripe_dispute_reconciliation
      (dispute_id, payment_id, amount_minor, currency, status, event_id, provider_created_at)
    VALUES (NEW.dispute_id, NEW.payment_id, NEW.amount_minor, NEW.currency,
      CASE
        WHEN NEW.status IN ('needs_response', 'warning_needs_response', 'under_review', 'warning_under_review', 'open') THEN 'open'
        WHEN NEW.status = 'won' THEN 'won'
        ELSE 'lost'
      END,
      NEW.event_id, NEW.provider_created_at)
    ON CONFLICT (dispute_id) DO UPDATE SET
      status = CASE
        WHEN EXCLUDED.provider_created_at >= public.stripe_dispute_reconciliation.provider_created_at
        THEN EXCLUDED.status
        ELSE public.stripe_dispute_reconciliation.status
      END,
      amount_minor = EXCLUDED.amount_minor,
      currency = EXCLUDED.currency,
      event_id = EXCLUDED.event_id,
      provider_created_at = GREATEST(public.stripe_dispute_reconciliation.provider_created_at, EXCLUDED.provider_created_at)
    WHERE public.stripe_dispute_reconciliation.payment_id = EXCLUDED.payment_id
      AND public.stripe_dispute_reconciliation.currency = EXCLUDED.currency;
  END IF;

  SELECT COALESCE(sum(amount_minor), 0) INTO refund_total
    FROM public.stripe_refund_reconciliation WHERE payment_id = NEW.payment_id;
  IF refund_total > payment.amount_minor THEN
    UPDATE public.stripe_payment_records
      SET refunded_minor = payment.amount_minor,
        reconciliation_status = 'refund_dispute_overlap'
      WHERE id = payment.id;
  END IF;

  SELECT count(*) INTO dispute_open
    FROM public.stripe_dispute_reconciliation
    WHERE payment_id = NEW.payment_id AND status = 'open';
  SELECT count(*) INTO dispute_lost
    FROM public.stripe_dispute_reconciliation
    WHERE payment_id = NEW.payment_id AND status = 'lost';

  IF refund_total >= payment.amount_minor THEN
    UPDATE public.stripe_payment_records
      SET refunded_minor = LEAST(refund_total, payment.amount_minor),
        reconciliation_status = CASE
          WHEN refund_total > payment.amount_minor THEN 'refund_dispute_overlap'
          WHEN dispute_open > 0 THEN 'refund_dispute_overlap'
          ELSE 'full_refund'
        END
      WHERE id = payment.id;
  ELSIF refund_total > 0 THEN
    UPDATE public.stripe_payment_records
      SET refunded_minor = refund_total,
        reconciliation_status = CASE
          WHEN dispute_open > 0 THEN 'refund_dispute_overlap'
          ELSE 'partial_refund'
        END
      WHERE id = payment.id;
  END IF;

  IF refund_total >= payment.amount_minor OR dispute_lost > 0 THEN
    target_status := 'canceled';
  ELSIF dispute_open > 0 THEN
    target_status := 'past_due';
  ELSE
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-sub:' || payment.subscription_id, 0));
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-user:' || payment.user_id::text, 0));
    IF EXISTS (
      SELECT 1 FROM public.stripe_subscription_revocations r
      WHERE r.subscription_id = payment.subscription_id
        AND r.user_id = payment.user_id
        AND r.provider_created_at > NEW.provider_created_at
    ) THEN
      RETURN NULL;
    END IF;
    IF NEW.kind = 'dispute' AND NEW.status = 'won'
       AND NOT EXISTS (
         SELECT 1 FROM public.stripe_subscription_revocations r
         WHERE r.subscription_id = payment.subscription_id
           AND r.user_id = payment.user_id
           AND r.status = 'canceled'
       ) THEN
      DELETE FROM public.stripe_subscription_revocations
        WHERE subscription_id = payment.subscription_id
          AND user_id = payment.user_id
          AND status = 'past_due';
    ELSIF EXISTS (
      SELECT 1 FROM public.stripe_subscription_revocations r
      WHERE r.subscription_id = payment.subscription_id
        AND r.user_id = payment.user_id
        AND r.status = 'canceled'
    ) THEN
      RETURN NULL;
    END IF;
    UPDATE public.subscriptions SET
      status = 'active',
      tier = payment.tier,
      provider = 'stripe',
      provider_subscription_id = payment.subscription_id,
      cancel_at_period_end = false,
      stripe_event_created_at = GREATEST(stripe_event_created_at, NEW.provider_created_at)
    WHERE user_id = payment.user_id
      AND provider = 'stripe'
      AND provider_subscription_id = payment.subscription_id
      AND (current_period_end IS NULL OR current_period_end > pg_catalog.now())
      AND (stripe_event_created_at IS NULL OR stripe_event_created_at <= NEW.provider_created_at);
    RETURN NULL;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-sub:' || payment.subscription_id, 0));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-user:' || payment.user_id::text, 0));
  INSERT INTO public.stripe_subscription_revocations
    (subscription_id, user_id, provider_created_at, status)
  VALUES (payment.subscription_id, payment.user_id, NEW.provider_created_at, target_status)
  ON CONFLICT (subscription_id) DO UPDATE SET
    provider_created_at = GREATEST(public.stripe_subscription_revocations.provider_created_at, EXCLUDED.provider_created_at),
    status = CASE
      WHEN EXCLUDED.status = 'canceled' THEN 'canceled'
      WHEN public.stripe_subscription_revocations.status = 'canceled' THEN 'canceled'
      ELSE EXCLUDED.status
    END
  WHERE public.stripe_subscription_revocations.user_id = EXCLUDED.user_id;

  UPDATE public.subscriptions SET
    status = target_status,
    stripe_event_created_at = GREATEST(stripe_event_created_at, NEW.provider_created_at)
  WHERE user_id = payment.user_id
    AND provider = 'stripe'
    AND provider_subscription_id = payment.subscription_id
    AND (stripe_event_created_at IS NULL OR stripe_event_created_at <= NEW.provider_created_at);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reconcile_stripe_adjustment_after_insert ON public.stripe_payment_adjustments;
CREATE TRIGGER reconcile_stripe_adjustment_after_insert
AFTER INSERT ON public.stripe_payment_adjustments
FOR EACH ROW EXECUTE FUNCTION public.reconcile_stripe_adjustment();

REVOKE ALL ON FUNCTION public.reconcile_stripe_adjustment() FROM PUBLIC, anon, authenticated;
