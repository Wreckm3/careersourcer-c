-- Local-only migration: server-controlled, revocable Atlas founder access.
-- Do not apply automatically.
CREATE TABLE IF NOT EXISTS public.founder_atlas_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founder_atlas_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.founder_atlas_entitlements FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.founder_atlas_entitlements TO service_role;

-- This function intentionally accepts no user ID. auth.uid() is populated from
-- the verified JWT, so callers can learn only their own entitlement state.
CREATE OR REPLACE FUNCTION public.has_founder_atlas_entitlement()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.founder_atlas_entitlements
      WHERE user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.has_founder_atlas_entitlement() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_founder_atlas_entitlement() TO authenticated;
