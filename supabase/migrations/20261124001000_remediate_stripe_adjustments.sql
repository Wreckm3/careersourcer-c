ALTER TABLE public.stripe_payment_records
  ADD COLUMN IF NOT EXISTS refunded_minor bigint NOT NULL DEFAULT 0 CHECK (refunded_minor >= 0),
  ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'none'
    CHECK (reconciliation_status IN ('none', 'partial_refund', 'full_refund', 'refund_dispute_overlap'));

CREATE TABLE IF NOT EXISTS public.stripe_refund_reconciliation (
  refund_id text PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES public.stripe_payment_records(id),
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  event_id text NOT NULL,
  provider_created_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_dispute_reconciliation (
  dispute_id text PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES public.stripe_payment_records(id),
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  status text NOT NULL CHECK (status IN ('open', 'won', 'lost')),
  event_id text NOT NULL,
  provider_created_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_refund_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_dispute_reconciliation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_refund_reconciliation, public.stripe_dispute_reconciliation FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stripe_refund_reconciliation, public.stripe_dispute_reconciliation TO authenticated;
GRANT ALL ON public.stripe_refund_reconciliation, public.stripe_dispute_reconciliation TO service_role;

CREATE POLICY stripe_refund_reconciliation_read_own ON public.stripe_refund_reconciliation
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.stripe_payment_records p WHERE p.id = payment_id AND p.user_id = auth.uid()
  ));
CREATE POLICY stripe_dispute_reconciliation_read_own ON public.stripe_dispute_reconciliation
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.stripe_payment_records p WHERE p.id = payment_id AND p.user_id = auth.uid()
  ));
