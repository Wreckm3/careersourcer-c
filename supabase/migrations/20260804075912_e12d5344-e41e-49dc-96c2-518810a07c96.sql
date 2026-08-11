CREATE TABLE IF NOT EXISTS public.atlas_memories (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  learning_path text,
  current_project jsonb,
  current_goal jsonb,
  project_category text,
  current_milestone jsonb,
  completed_milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_foundation_paths text[] NOT NULL DEFAULT '{}',
  recent_conversations jsonb NOT NULL DEFAULT '[]'::jsonb,
  strengths text[] NOT NULL DEFAULT '{}',
  weaknesses text[] NOT NULL DEFAULT '{}',
  interests text[] NOT NULL DEFAULT '{}',
  preferred_language text,
  favourite_technologies text[] NOT NULL DEFAULT '{}',
  time_available_for_learning text,
  preferred_difficulty text NOT NULL DEFAULT 'starter',
  current_subscription_tier public.subscription_tier NOT NULL DEFAULT 'free',
  last_active_date timestamptz NOT NULL DEFAULT now(),
  schema_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atlas_memories TO authenticated;
GRANT ALL ON public.atlas_memories TO service_role;

ALTER TABLE public.atlas_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own Atlas memory" ON public.atlas_memories;
CREATE POLICY "Users read own Atlas memory"
ON public.atlas_memories FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users insert own Atlas memory" ON public.atlas_memories;
CREATE POLICY "Users insert own Atlas memory"
ON public.atlas_memories FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own Atlas memory" ON public.atlas_memories;
CREATE POLICY "Users update own Atlas memory"
ON public.atlas_memories FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_atlas_memories_updated_at ON public.atlas_memories;
CREATE TRIGGER update_atlas_memories_updated_at
BEFORE UPDATE ON public.atlas_memories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();