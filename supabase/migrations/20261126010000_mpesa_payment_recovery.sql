-- Service-only recovery of independently verified, previously unfulfilled STK payments.
-- Evidence must come from merchant/provider records, not a customer SMS or an
-- STK query alone. Never store credentials or personal data in evidence references.
CREATE TABLE public.mpesa_payment_recoveries (
  payment_id uuid PRIMARY KEY REFERENCES public.mpesa_payments(id),
  evidence_reference text NOT NULL CHECK (length(btrim(evidence_reference)) BETWEEN 1 AND 500),
  previous_status text NOT NULL,
  receipt text NOT NULL UNIQUE,
  recovered_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mpesa_payment_recoveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mpesa_payment_recoveries FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.mpesa_payment_recoveries TO service_role;

CREATE FUNCTION public.recover_mpesa_payment(
  _payment_id uuid, _checkout_id text, _merchant_id text, _receipt text,
  _amount_kes integer, _phone_number text, _evidence_reference text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  p public.mpesa_payments%ROWTYPE;
  receipt text := upper(btrim(_receipt));
  applied boolean;
BEGIN
  IF _payment_id IS NULL OR NULLIF(btrim(_checkout_id),'') IS NULL
     OR NULLIF(btrim(_merchant_id),'') IS NULL OR receipt IS NULL
     OR receipt !~ '^[A-Z0-9]{3,40}$' OR _amount_kes IS NULL OR _amount_kes <= 0
     OR _phone_number IS NULL OR _phone_number !~ '^254[17][0-9]{8}$'
     OR _evidence_reference IS NULL OR length(btrim(_evidence_reference)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'INVALID_MPESA_RECOVERY_EVIDENCE';
  END IF;
  -- Same payment and account locks as normal callback settlement.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mpesa-payment:' || _payment_id::text, 0));
  SELECT * INTO p FROM public.mpesa_payments WHERE id=_payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('recovered',false,'reason','payment_not_found'); END IF;
  IF p.status='success' OR p.payment_period_key IS NOT NULL OR p.verified_at IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.mpesa_payment_recoveries WHERE payment_id=p.id) THEN
    RETURN jsonb_build_object('recovered',false,'reason','already_fulfilled');
  END IF;
  IF p.status NOT IN ('pending','unknown','failed','cancelled','timeout')
     OR p.reconciliation_status='reversed'
     OR EXISTS (SELECT 1 FROM public.mpesa_payment_adjustments WHERE payment_id=p.id) THEN
    RETURN jsonb_build_object('recovered',false,'reason','payment_requires_review');
  END IF;
  IF p.created_at > pg_catalog.now()-interval '10 minutes' THEN
    RETURN jsonb_build_object('recovered',false,'reason','payment_not_stale');
  END IF;
  IF p.checkout_request_id IS DISTINCT FROM _checkout_id OR p.merchant_request_id IS DISTINCT FROM _merchant_id
     OR p.amount_kes IS DISTINCT FROM _amount_kes OR p.phone_number IS DISTINCT FROM _phone_number
     OR p.currency IS DISTINCT FROM 'KES' OR public.mpesa_plan_amount(p.tier) IS DISTINCT FROM _amount_kes
     OR (p.mpesa_receipt_number IS NOT NULL AND upper(p.mpesa_receipt_number)<>receipt)
     OR (p.provider_transaction_id IS NOT NULL AND upper(p.provider_transaction_id)<>receipt) THEN
    RETURN jsonb_build_object('recovered',false,'reason','evidence_mismatch');
  END IF;
  -- Existing unique receipt/transaction constraints remain the final safeguard.
  IF EXISTS (SELECT 1 FROM public.mpesa_payments other WHERE other.id<>p.id
      AND (upper(other.mpesa_receipt_number)=receipt OR upper(other.provider_transaction_id)=receipt)) THEN
    RETURN jsonb_build_object('recovered',false,'reason','receipt_already_used');
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-user:' || p.user_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id=p.user_id
      AND s.provider='stripe' AND s.status IN ('active','trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end>pg_catalog.now())) THEN
    RETURN jsonb_build_object('recovered',false,'reason','active_stripe_entitlement');
  END IF;
  -- Recovery is atomic: reopening, ordinary finalization and audit insert either
  -- all commit or all roll back. The original callback payload is preserved.
  UPDATE public.mpesa_payments SET status='pending' WHERE id=p.id;
  applied := public.finalize_mpesa_payment(p.id,'success',receipt,0,'Operator verified recovery',
    p.callback_payload,p.transaction_date,_phone_number,_amount_kes);
  IF applied IS DISTINCT FROM true THEN RAISE EXCEPTION 'MPESA_RECOVERY_NOT_APPLIED'; END IF;
  INSERT INTO public.mpesa_payment_recoveries(payment_id,evidence_reference,previous_status,receipt)
    VALUES(p.id,btrim(_evidence_reference),p.status,receipt);
  RETURN jsonb_build_object('recovered',true,'payment_id',p.id);
END;
$$;
REVOKE ALL ON FUNCTION public.recover_mpesa_payment(uuid,text,text,text,integer,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_mpesa_payment(uuid,text,text,text,integer,text,text) TO service_role;
