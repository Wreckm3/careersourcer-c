CREATE OR REPLACE FUNCTION public.finalize_mpesa_payment(
  _payment_id UUID, _status TEXT, _receipt TEXT, _result_code INTEGER,
  _result_description TEXT, _callback_payload JSONB,
  _transaction_date TEXT DEFAULT NULL, _phone_number TEXT DEFAULT NULL,
  _amount_kes INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  payment public.mpesa_payments%ROWTYPE;
  existing public.subscriptions%ROWTYPE;
BEGIN
  IF _status NOT IN ('success', 'failed', 'cancelled', 'timeout', 'unknown') THEN
    RAISE EXCEPTION 'Invalid M-Pesa settlement status';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mpesa-user:' || _payment_id::text, 0));
  SELECT * INTO payment FROM public.mpesa_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND OR payment.status <> 'pending' THEN RETURN FALSE; END IF;
  IF _status = 'success'
     AND (_receipt IS NULL OR _amount_kes IS DISTINCT FROM payment.amount_kes
          OR _phone_number IS DISTINCT FROM payment.phone_number) THEN
    RAISE EXCEPTION 'Successful M-Pesa payment does not match the pending request';
  END IF;

  UPDATE public.mpesa_payments SET
    status = _status,
    mpesa_receipt_number = CASE WHEN _status = 'success' THEN _receipt ELSE NULL END,
    result_code = _result_code,
    result_description = _result_description,
    callback_payload = _callback_payload,
    transaction_date = _transaction_date,
    callback_phone_number = _phone_number,
    callback_amount_kes = _amount_kes,
    completed_at = pg_catalog.now()
  WHERE id = payment.id;

  IF _status = 'success' THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-user:' || payment.user_id::text, 0));
    SELECT * INTO existing FROM public.subscriptions WHERE user_id = payment.user_id FOR UPDATE;
    IF FOUND AND existing.provider = 'stripe'
       AND (existing.status IN ('active', 'trialing'))
       AND (existing.current_period_end IS NULL OR existing.current_period_end > pg_catalog.now()) THEN
      UPDATE public.mpesa_payments
        SET status = 'unknown',
            mpesa_receipt_number = NULL,
            result_description = 'M-Pesa settlement rejected while a valid Stripe entitlement is active',
            completed_at = pg_catalog.now()
        WHERE id = payment.id;
      RETURN FALSE;
    END IF;
    INSERT INTO public.subscriptions
      (user_id, tier, status, provider, provider_subscription_id, current_period_end, cancel_at_period_end)
    VALUES (payment.user_id, payment.tier, 'active', 'mpesa', _receipt,
      pg_catalog.now() + interval '30 days', false)
    ON CONFLICT (user_id) DO UPDATE SET
      tier = EXCLUDED.tier,
      status = 'active',
      provider = 'mpesa',
      provider_subscription_id = EXCLUDED.provider_subscription_id,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = false;
  END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_mpesa_payment(UUID, TEXT, TEXT, INTEGER, TEXT, JSONB, TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_mpesa_payment(UUID, TEXT, TEXT, INTEGER, TEXT, JSONB, TEXT, TEXT, INTEGER)
  TO service_role;
