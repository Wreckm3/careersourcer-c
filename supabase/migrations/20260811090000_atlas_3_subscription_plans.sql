-- Atlas 3.0 plan vocabulary. Renaming enum values preserves all existing
-- subscriptions and dependent foreign/table values without weakening RLS.
ALTER TYPE public.subscription_tier RENAME VALUE 'creator' TO 'professional';
ALTER TYPE public.subscription_tier RENAME VALUE 'visionary' TO 'elite';

CREATE TABLE IF NOT EXISTS public.payment_events (
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_event_id)
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_events FROM anon, authenticated;
GRANT ALL ON public.payment_events TO service_role;

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('stripe', 'mpesa')),
  tier public.subscription_tier NOT NULL,
  amount_kes integer NOT NULL CHECK (amount_kes > 0),
  currency text NOT NULL DEFAULT 'KES',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled', 'refunded')),
  provider_reference text UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own payment transactions" ON public.payment_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.payment_transactions FROM anon, authenticated;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

CREATE TRIGGER payment_transactions_set_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_user_tier(_user_id UUID)
RETURNS public.subscription_tier
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'admin') THEN 'elite'::public.subscription_tier
    ELSE COALESCE(
      (SELECT tier FROM public.subscriptions
       WHERE user_id = _user_id
         AND status IN ('active','trialing')
         AND (current_period_end IS NULL OR current_period_end > now())
       LIMIT 1),
      'free'::public.subscription_tier
    )
  END;
$$;
