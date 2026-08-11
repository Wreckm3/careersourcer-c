-- M-Pesa STK Push ledger. The browser never writes here; Edge Functions use service_role.
CREATE TABLE IF NOT EXISTS public.mpesa_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier public.subscription_tier NOT NULL,
  amount_kes INTEGER NOT NULL CHECK (amount_kes IN (99, 299, 499)),
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'timeout', 'unknown')),
  merchant_request_id TEXT UNIQUE,
  checkout_request_id TEXT UNIQUE,
  mpesa_receipt_number TEXT UNIQUE,
  result_code INTEGER,
  result_description TEXT,
  callback_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS mpesa_payments_user_created_idx
  ON public.mpesa_payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mpesa_payments_checkout_request_idx
  ON public.mpesa_payments (checkout_request_id);

REVOKE ALL ON public.mpesa_payments FROM anon, authenticated;
GRANT ALL ON public.mpesa_payments TO service_role;
ALTER TABLE public.mpesa_payments ENABLE ROW LEVEL SECURITY;

-- Keep plans and amounts in one server-side source of truth. This cannot be influenced by browser input.
CREATE OR REPLACE FUNCTION public.mpesa_plan_amount(_tier public.subscription_tier)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _tier
    WHEN 'builder'::public.subscription_tier THEN 99
    WHEN 'creator'::public.subscription_tier THEN 299
    WHEN 'visionary'::public.subscription_tier THEN 499
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.mpesa_plan_amount(public.subscription_tier) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mpesa_plan_amount(public.subscription_tier) TO service_role;

-- Settle callback data and subscription access in one transaction. The row lock and
-- pending-status guard make duplicate callback delivery harmless.
CREATE OR REPLACE FUNCTION public.finalize_mpesa_payment(
  _payment_id UUID, _status TEXT, _receipt TEXT, _result_code INTEGER,
  _result_description TEXT, _callback_payload JSONB
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
  IF _status = 'success' AND _receipt IS NULL THEN
    RAISE EXCEPTION 'Successful M-Pesa payment requires a receipt number';
  END IF;
  UPDATE public.mpesa_payments SET
    status = _status,
    mpesa_receipt_number = CASE WHEN _status = 'success' THEN _receipt ELSE NULL END,
    result_code = _result_code, result_description = _result_description,
    callback_payload = _callback_payload, completed_at = now()
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

REVOKE ALL ON FUNCTION public.finalize_mpesa_payment(UUID, TEXT, TEXT, INTEGER, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_mpesa_payment(UUID, TEXT, TEXT, INTEGER, TEXT, JSONB) TO service_role;
