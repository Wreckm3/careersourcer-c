-- Complete the canonical M-Pesa ledger without replacing existing records.
ALTER TABLE public.mpesa_payments
  ADD COLUMN IF NOT EXISTS initiation_response JSONB,
  ADD COLUMN IF NOT EXISTS initiation_response_code TEXT,
  ADD COLUMN IF NOT EXISTS initiation_response_description TEXT,
  ADD COLUMN IF NOT EXISTS customer_message TEXT,
  ADD COLUMN IF NOT EXISTS transaction_date TEXT,
  ADD COLUMN IF NOT EXISTS callback_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS callback_amount_kes INTEGER;

CREATE OR REPLACE FUNCTION public.mpesa_plan_amount(_tier public.subscription_tier)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE _tier
    WHEN 'builder'::public.subscription_tier THEN 99
    WHEN 'professional'::public.subscription_tier THEN 299
    WHEN 'elite'::public.subscription_tier THEN 499
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_mpesa_payment(
  _payment_id UUID, _status TEXT, _receipt TEXT, _result_code INTEGER,
  _result_description TEXT, _callback_payload JSONB,
  _transaction_date TEXT DEFAULT NULL, _phone_number TEXT DEFAULT NULL,
  _amount_kes INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE payment public.mpesa_payments%ROWTYPE;
BEGIN
  IF _status NOT IN ('success', 'failed', 'cancelled', 'timeout', 'unknown') THEN
    RAISE EXCEPTION 'Invalid M-Pesa settlement status';
  END IF;
  SELECT * INTO payment FROM public.mpesa_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND OR payment.status <> 'pending' THEN RETURN FALSE; END IF;
  IF _status = 'success' AND (_receipt IS NULL OR _amount_kes IS DISTINCT FROM payment.amount_kes) THEN
    RAISE EXCEPTION 'Successful M-Pesa payment does not match the pending request';
  END IF;
  UPDATE public.mpesa_payments SET
    status = _status,
    mpesa_receipt_number = CASE WHEN _status = 'success' THEN _receipt ELSE NULL END,
    result_code = _result_code, result_description = _result_description,
    callback_payload = _callback_payload, transaction_date = _transaction_date,
    callback_phone_number = _phone_number, callback_amount_kes = _amount_kes,
    completed_at = now()
  WHERE id = payment.id;
  IF _status = 'success' THEN
    INSERT INTO public.subscriptions (user_id, tier, status, provider, provider_subscription_id, current_period_end, cancel_at_period_end)
    VALUES (payment.user_id, payment.tier, 'active', 'mpesa', _receipt, now() + interval '30 days', false)
    ON CONFLICT (user_id) DO UPDATE SET
      tier = EXCLUDED.tier, status = 'active', provider = 'mpesa',
      provider_subscription_id = EXCLUDED.provider_subscription_id,
      current_period_end = EXCLUDED.current_period_end, cancel_at_period_end = false;
  END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_mpesa_payment(UUID, TEXT, TEXT, INTEGER, TEXT, JSONB, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_mpesa_payment(UUID, TEXT, TEXT, INTEGER, TEXT, JSONB, TEXT, TEXT, INTEGER) TO service_role;

-- The extended signature above is the sole settlement entry point going forward.
DROP FUNCTION IF EXISTS public.finalize_mpesa_payment(UUID, TEXT, TEXT, INTEGER, TEXT, JSONB);
