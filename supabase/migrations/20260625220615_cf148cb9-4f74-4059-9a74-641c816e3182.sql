
-- 1) Extend user_progress with per-day streak history
ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS streak_days TEXT[] NOT NULL DEFAULT '{}';

-- 2) Collaboration Pool
CREATE TABLE IF NOT EXISTS public.pool_profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  branches TEXT[] NOT NULL DEFAULT '{}',
  looking_for TEXT,
  contact_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pool_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pool_profiles TO authenticated;
GRANT ALL ON public.pool_profiles TO service_role;

ALTER TABLE public.pool_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pool profiles are publicly readable" ON public.pool_profiles;
CREATE POLICY "Pool profiles are publicly readable"
  ON public.pool_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users insert own pool profile" ON public.pool_profiles;
CREATE POLICY "Users insert own pool profile"
  ON public.pool_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own pool profile" ON public.pool_profiles;
CREATE POLICY "Users update own pool profile"
  ON public.pool_profiles FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own pool profile" ON public.pool_profiles;
CREATE POLICY "Users delete own pool profile"
  ON public.pool_profiles FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS pool_profiles_branches_idx
  ON public.pool_profiles USING GIN (branches);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_pool_profiles_updated_at ON public.pool_profiles;
CREATE TRIGGER update_pool_profiles_updated_at
  BEFORE UPDATE ON public.pool_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
