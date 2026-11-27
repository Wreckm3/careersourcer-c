-- The UI needs one latest attempt and its latest assessment per lesson,
-- not the last 12 rows across the entire learning path.
CREATE INDEX atlas_studyflow_evidence_latest_lesson_idx
  ON public.atlas_studyflow_evidence
  (user_id, branch_id, roadmap_revision, item_id, created_at DESC, id DESC);
CREATE INDEX atlas_studyflow_assessment_latest_evidence_idx
  ON public.atlas_studyflow_assessments
  (user_id, evidence_id, roadmap_revision, created_at DESC, id DESC);

CREATE FUNCTION public.atlas_studyflow_mastery_snapshot(_branch_id text, _revision integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH latest_evidence AS (
    SELECT DISTINCT ON (e.item_id) e.*
    FROM public.atlas_studyflow_evidence AS e
    WHERE e.user_id = (SELECT auth.uid())
      AND e.branch_id = _branch_id AND e.roadmap_revision = _revision
    ORDER BY e.item_id, e.created_at DESC, e.id DESC
  ), latest_assessments AS (
    SELECT a.* FROM latest_evidence AS e
    CROSS JOIN LATERAL (
      SELECT assessment.* FROM public.atlas_studyflow_assessments AS assessment
      WHERE assessment.user_id = e.user_id AND assessment.evidence_id = e.id
        AND assessment.branch_id = e.branch_id
        AND assessment.roadmap_revision = e.roadmap_revision
      ORDER BY assessment.created_at DESC, assessment.id DESC
      LIMIT 1
    ) AS a
  )
  SELECT jsonb_build_object(
    'evidence', COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC, e.id DESC) FROM latest_evidence AS e), '[]'::jsonb),
    'assessments', COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC, a.id DESC) FROM latest_assessments AS a), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.atlas_studyflow_mastery_snapshot(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atlas_studyflow_mastery_snapshot(text, integer) TO authenticated;
