CREATE TABLE IF NOT EXISTS public.atlas_study_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(profile) = 'object' AND octet_length(profile::text) <= 12000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.atlas_studyflows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id text NOT NULL CHECK (branch_id ~ '^[a-z0-9][a-z0-9-]{0,119}$'),
  status text NOT NULL DEFAULT 'discovery'
    CHECK (status IN ('discovery', 'awaiting_approval', 'active')),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  roadmap_history jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(roadmap_history) = 'array' AND octet_length(roadmap_history::text) <= 1200000
  ),
  active_roadmap jsonb CHECK (
    active_roadmap IS NULL OR
    (jsonb_typeof(active_roadmap) = 'object' AND octet_length(active_roadmap::text) <= 100000)
  ),
  proposal_id uuid,
  proposed_roadmap jsonb CHECK (
    proposed_roadmap IS NULL OR
    (jsonb_typeof(proposed_roadmap) = 'object' AND octet_length(proposed_roadmap::text) <= 100000)
  ),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, branch_id),
  CHECK (
    (status = 'discovery' AND active_roadmap IS NULL AND proposed_roadmap IS NULL)
    OR (status = 'awaiting_approval' AND proposed_roadmap IS NOT NULL AND proposal_id IS NOT NULL)
    OR (status = 'active' AND active_roadmap IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.atlas_studyflow_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id text NOT NULL,
  roadmap_revision integer NOT NULL CHECK (roadmap_revision > 0),
  item_id text NOT NULL CHECK (length(item_id) BETWEEN 1 AND 120),
  evidence_text text NOT NULL CHECK (length(btrim(evidence_text)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.atlas_studyflow_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id text NOT NULL,
  roadmap_revision integer NOT NULL CHECK (roadmap_revision > 0),
  evidence_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('needs_practice', 'developing', 'criteria_met')),
  feedback text NOT NULL CHECK (length(btrim(feedback)) BETWEEN 1 AND 1600),
  criteria_met text[] NOT NULL DEFAULT '{}',
  remaining_gaps text[] NOT NULL DEFAULT '{}',
  next_step text NOT NULL CHECK (length(btrim(next_step)) BETWEEN 1 AND 600),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, evidence_id)
    REFERENCES public.atlas_studyflow_evidence(user_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS atlas_studyflow_evidence_owner_idx
  ON public.atlas_studyflow_evidence(user_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS atlas_studyflow_assessment_owner_idx
  ON public.atlas_studyflow_assessments(user_id, branch_id, created_at DESC);

ALTER TABLE public.atlas_study_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_studyflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_studyflow_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_studyflow_assessments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.atlas_study_profiles, public.atlas_studyflows,
  public.atlas_studyflow_evidence, public.atlas_studyflow_assessments
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atlas_study_profiles TO authenticated;
GRANT SELECT ON public.atlas_studyflows, public.atlas_studyflow_evidence,
  public.atlas_studyflow_assessments TO authenticated;
GRANT ALL ON public.atlas_study_profiles, public.atlas_studyflows,
  public.atlas_studyflow_evidence, public.atlas_studyflow_assessments TO service_role;

DROP POLICY IF EXISTS atlas_study_profiles_owner_all ON public.atlas_study_profiles;
CREATE POLICY atlas_study_profiles_owner_all ON public.atlas_study_profiles
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS atlas_studyflows_owner_read ON public.atlas_studyflows;
CREATE POLICY atlas_studyflows_owner_read ON public.atlas_studyflows
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS atlas_studyflow_evidence_owner_read ON public.atlas_studyflow_evidence;
CREATE POLICY atlas_studyflow_evidence_owner_read ON public.atlas_studyflow_evidence
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS atlas_studyflow_assessments_owner_read ON public.atlas_studyflow_assessments;
CREATE POLICY atlas_studyflow_assessments_owner_read ON public.atlas_studyflow_assessments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.atlas_approve_studyflow_proposal(_branch_id text)
RETURNS public.atlas_studyflows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _flow public.atlas_studyflows;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.atlas_studyflows AS flow
  SET active_roadmap = flow.proposed_roadmap,
      roadmap_history = CASE
        WHEN flow.active_roadmap IS NULL THEN flow.roadmap_history
        ELSE (
          SELECT COALESCE(jsonb_agg(history.item ORDER BY history.ordinal), '[]'::jsonb)
          FROM (
            SELECT previous.item, previous.ordinal
            FROM jsonb_array_elements(
              flow.roadmap_history || jsonb_build_array(
                jsonb_build_object(
                  'revision', flow.revision,
                  'approvedRoadmap', flow.active_roadmap,
                  'preservedAt', now()
                )
              )
            ) WITH ORDINALITY AS previous(item, ordinal)
            ORDER BY previous.ordinal DESC
            LIMIT 10
          ) AS history
        )
      END,
      proposed_roadmap = NULL,
      proposal_id = NULL,
      status = 'active',
      revision = flow.revision + 1,
      updated_at = now()
  WHERE flow.user_id = _user_id
    AND flow.branch_id = _branch_id
    AND flow.status = 'awaiting_approval'
    AND flow.proposed_roadmap IS NOT NULL
  RETURNING flow.* INTO _flow;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending StudyFlow proposal';
  END IF;

  RETURN _flow;
END;
$$;

REVOKE ALL ON FUNCTION public.atlas_approve_studyflow_proposal(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atlas_approve_studyflow_proposal(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.atlas_submit_studyflow_evidence(
  _branch_id text,
  _item_id text,
  _evidence_text text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _roadmap public.atlas_studyflows.active_roadmap%TYPE;
  _revision integer;
  _evidence_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF length(btrim(_evidence_text)) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'Evidence must contain between 1 and 4000 characters';
  END IF;

  SELECT flow.active_roadmap, flow.revision
    INTO _roadmap, _revision
  FROM public.atlas_studyflows AS flow
  WHERE flow.user_id = _user_id
    AND flow.branch_id = _branch_id
    AND flow.status = 'active';

  IF _roadmap IS NULL OR NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(_roadmap->'objectives', '[]'::jsonb)) AS objective(value),
         jsonb_array_elements(COALESCE(objective.value->'stages', '[]'::jsonb)) AS stage(value),
         jsonb_array_elements(COALESCE(stage.value->'lessons', '[]'::jsonb)) AS lesson(value)
    WHERE lesson.value->>'id' = _item_id
  ) THEN
    RAISE EXCEPTION 'Evidence target is not part of the active roadmap';
  END IF;

  INSERT INTO public.atlas_studyflow_evidence
    (user_id, branch_id, roadmap_revision, item_id, evidence_text)
  VALUES (_user_id, _branch_id, _revision, _item_id, btrim(_evidence_text))
  RETURNING id INTO _evidence_id;

  RETURN _evidence_id;
END;
$$;

REVOKE ALL ON FUNCTION public.atlas_submit_studyflow_evidence(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atlas_submit_studyflow_evidence(text, text, text) TO authenticated;

DROP TRIGGER IF EXISTS atlas_study_profiles_updated_at ON public.atlas_study_profiles;
CREATE TRIGGER atlas_study_profiles_updated_at
  BEFORE UPDATE ON public.atlas_study_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS atlas_studyflows_updated_at ON public.atlas_studyflows;
CREATE TRIGGER atlas_studyflows_updated_at
  BEFORE UPDATE ON public.atlas_studyflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
