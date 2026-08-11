ALTER TABLE public.atlas_memories
  ADD COLUMN IF NOT EXISTS learning_pace text,
  ADD COLUMN IF NOT EXISTS learning_style text,
  ADD COLUMN IF NOT EXISTS recent_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS struggle_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_celebrated_milestone text;