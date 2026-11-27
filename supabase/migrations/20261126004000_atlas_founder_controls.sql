-- Separate operational privilege from ordinary subscriptions and founder mentorship.
-- No operator is provisioned by this migration. A trusted database administrator
-- must explicitly grant an existing founder an operator row in the intended environment.
CREATE TABLE public.atlas_founder_operators (
  user_id uuid PRIMARY KEY REFERENCES public.founder_atlas_entitlements(user_id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.atlas_founder_control_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action = 'pause_generation'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atlas_founder_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_founder_control_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atlas_founder_operators, public.atlas_founder_control_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.atlas_founder_operators TO service_role;
GRANT SELECT ON public.atlas_founder_control_events TO service_role;

CREATE FUNCTION public.atlas_founder_control_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  controls public.atlas_financial_controls%ROWTYPE;
  usage_summary jsonb;
  day_start timestamptz := date_trunc('day', now());
  month_start timestamptz := date_trunc('month', now());
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.atlas_founder_operators WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ATLAS_OPERATOR_REQUIRED';
  END IF;
  SELECT * INTO controls FROM public.atlas_financial_controls WHERE id = 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Atlas financial controls unavailable'; END IF;

  -- Match the existing reservation budget accounting. These are internal
  -- estimated amounts, not invoice-verified provider costs or revenue.
  SELECT jsonb_build_object(
    'daily_accounted_micro_kes', COALESCE(sum(CASE WHEN status = 'reserved' THEN reserved_budget_micro_kes ELSE actual_budget_micro_kes END) FILTER (WHERE created_at >= day_start), 0)::text,
    'monthly_accounted_micro_kes', COALESCE(sum(CASE WHEN status = 'reserved' THEN reserved_budget_micro_kes ELSE actual_budget_micro_kes END) FILTER (WHERE created_at >= month_start), 0)::text,
    'monthly_settled_estimate_micro_kes', COALESCE(sum(actual_budget_micro_kes) FILTER (WHERE created_at >= month_start AND status = 'settled'), 0)::text,
    'outstanding_micro_kes', COALESCE(sum(CASE WHEN status = 'reserved' THEN reserved_budget_micro_kes ELSE GREATEST(reserved_budget_micro_kes, actual_budget_micro_kes) END) FILTER (WHERE status IN ('reserved','uncertain')), 0)::text,
    'reserved_count', count(*) FILTER (WHERE status = 'reserved'),
    'uncertain_count', count(*) FILTER (WHERE status = 'uncertain'),
    'monthly_requests', count(*) FILTER (WHERE created_at >= month_start),
    'monthly_failed_count', count(*) FILTER (WHERE created_at >= month_start AND status = 'failed'),
    'monthly_settled_credits', COALESCE(sum(actual_credits) FILTER (WHERE created_at >= month_start AND status = 'settled'), 0)::text
  ) INTO usage_summary
  FROM public.atlas_usage_requests
  WHERE created_at >= month_start OR status IN ('reserved','uncertain');

  RETURN usage_summary || jsonb_build_object(
    'emergency_shutdown', controls.emergency_shutdown,
    'global_daily_budget_micro_kes', controls.global_daily_budget_micro_kes::text,
    'individual_daily_budget_micro_kes', controls.individual_daily_budget_micro_kes::text,
    'timezone', current_setting('TimeZone'),
    'captured_at', now(),
    'last_pause_at', (SELECT max(created_at) FROM public.atlas_founder_control_events WHERE action = 'pause_generation')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.atlas_founder_control_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atlas_founder_control_snapshot() TO authenticated;

-- One-way emergency latch. Resume and increases in spending authority are
-- intentionally not exposed to a browser. The same control row is locked by
-- atlas_reserve_request, so new reservations see the committed pause.
CREATE FUNCTION public.atlas_founder_pause_generation()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  already_paused boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.atlas_founder_operators WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ATLAS_OPERATOR_REQUIRED';
  END IF;
  SELECT emergency_shutdown INTO already_paused
    FROM public.atlas_financial_controls WHERE id = 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Atlas financial controls unavailable'; END IF;
  IF NOT already_paused THEN
    UPDATE public.atlas_financial_controls SET emergency_shutdown = true, updated_at = now() WHERE id = 1;
    INSERT INTO public.atlas_founder_control_events(actor_user_id, action)
      VALUES (auth.uid(), 'pause_generation');
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.atlas_founder_pause_generation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atlas_founder_pause_generation() TO authenticated;
