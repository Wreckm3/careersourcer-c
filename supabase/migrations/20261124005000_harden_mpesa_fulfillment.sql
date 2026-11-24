ALTER TABLE public.mpesa_payments
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS provider_transaction_id text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_period_key text,
  ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'none'
    CHECK (reconciliation_status IN ('none', 'pending', 'success', 'failed', 'cancelled', 'timeout', 'unknown', 'reversed'));

CREATE UNIQUE INDEX IF NOT EXISTS mpesa_payments_provider_transaction_id_uidx
  ON public.mpesa_payments(provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.mpesa_payment_adjustments (
  event_id text PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES public.mpesa_payments(id),
  kind text NOT NULL CHECK (kind IN ('reversal', 'refund')),
  amount_kes integer NOT NULL CHECK (amount_kes >= 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  provider_reference text,
  status text,
  provider_created_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mpesa_payment_adjustments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mpesa_payment_adjustments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mpesa_payment_adjustments TO authenticated;
GRANT ALL ON public.mpesa_payment_adjustments TO service_role;

CREATE POLICY mpesa_payment_adjustments_read_own ON public.mpesa_payment_adjustments
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.mpesa_payments p WHERE p.id = payment_id AND p.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.mpesa_plan_amount(_tier public.subscription_tier)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE _tier
    WHEN 'builder'::public.subscription_tier THEN 99
    WHEN 'professional'::public.subscription_tier THEN 299
    WHEN 'elite'::public.subscription_tier THEN 499
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.mpesa_plan_amount(public.subscription_tier) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mpesa_plan_amount(public.subscription_tier) TO service_role;
