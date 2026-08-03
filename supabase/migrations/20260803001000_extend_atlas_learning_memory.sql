ALTER TABLE public.atlas_memories
ADD COLUMN IF NOT EXISTS preferred_language text,
ADD COLUMN IF NOT EXISTS favourite_technologies text[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS time_available_for_learning text;
