BEGIN;
SELECT plan(20);

INSERT INTO auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('de000000-0000-4000-8000-000000000021', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'studyflow-owner@example.test', '', now(), '{}', '{}', now(), now()),
  ('de000000-0000-4000-8000-000000000022', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'studyflow-other@example.test', '', now(), '{}', '{}', now(), now());

INSERT INTO public.atlas_study_profiles(user_id, profile)
VALUES ('de000000-0000-4000-8000-000000000021', '{"interests":["game design"]}'::jsonb);

INSERT INTO public.atlas_studyflows
  (user_id, branch_id, status, proposal_id, proposed_roadmap)
VALUES (
  'de000000-0000-4000-8000-000000000021',
  'web-development',
  'awaiting_approval',
  'de000000-0000-4000-8000-000000000099',
  '{"objectives":[{"id":"goal","stages":[{"id":"stage-one","lessons":[{"id":"lesson-one"}]}]}]}'::jsonb
);

SELECT ok(
  has_table_privilege('authenticated', 'public.atlas_study_profiles', 'SELECT')
  AND has_table_privilege('authenticated', 'public.atlas_study_profiles', 'UPDATE'),
  'learners can review and correct their own profile rows'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.atlas_studyflows', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.atlas_studyflows', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.atlas_studyflow_evidence', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.atlas_studyflow_evidence', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.atlas_studyflow_assessments', 'INSERT'),
  'roadmaps and evidence cannot be directly written or removed by clients'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.atlas_study_profiles', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.atlas_studyflows', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.atlas_studyflow_assessments', 'SELECT')
  AND NOT has_function_privilege('anon', 'public.atlas_approve_studyflow_proposal(text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.atlas_submit_studyflow_evidence(text,text,text)', 'EXECUTE'),
  'anonymous users cannot access StudyFlow data or operations'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.atlas_approve_studyflow_proposal(text)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.atlas_submit_studyflow_evidence(text,text,text)', 'EXECUTE'),
  'authenticated learners can use the ownership-checked StudyFlow operations'
);
SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=pg_catalog, public, pg_temp']::text[]
   FROM pg_proc WHERE oid = 'public.atlas_approve_studyflow_proposal(text)'::regprocedure)
  AND
  (SELECT proconfig @> ARRAY['search_path=pg_catalog, public, pg_temp']::text[]
   FROM pg_proc WHERE oid = 'public.atlas_submit_studyflow_evidence(text,text,text)'::regprocedure),
  'SECURITY DEFINER functions pin a safe search path'
);

SELECT set_config('request.jwt.claim.sub', 'de000000-0000-4000-8000-000000000021', true);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::integer FROM public.atlas_study_profiles),
  1,
  'a learner can read their own profile'
);
SELECT is(
  (SELECT count(*)::integer FROM public.atlas_studyflows),
  1,
  'a learner can read their own roadmap'
);
INSERT INTO public.atlas_study_profiles(user_id, profile)
VALUES (auth.uid(), '{"interests":["game design","animation"]}'::jsonb)
ON CONFLICT (user_id) DO UPDATE SET profile = EXCLUDED.profile;
SELECT is(
  (SELECT profile->'interests'->>1 FROM public.atlas_study_profiles WHERE user_id = auth.uid()),
  'animation',
  'a learner can correct their own profile'
);
SELECT is(
  (SELECT count(*)::integer FROM public.atlas_studyflow_evidence),
  0,
  'evidence history is empty until submitted through the checked operation'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'de000000-0000-4000-8000-000000000022', true);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::integer FROM public.atlas_study_profiles),
  0,
  'a different learner cannot read another profile'
);
SELECT is(
  (SELECT count(*)::integer FROM public.atlas_studyflows),
  0,
  'a different learner cannot read another roadmap'
);
SELECT throws_ok(
  $$ SELECT public.atlas_approve_studyflow_proposal('web-development') $$,
  'P0001',
  'No pending StudyFlow proposal',
  'a different learner cannot approve another learner roadmap'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'de000000-0000-4000-8000-000000000021', true);
SET LOCAL ROLE authenticated;
SELECT is(
  (public.atlas_approve_studyflow_proposal('web-development')).status,
  'active',
  'the owner can approve a saved proposal'
);
SELECT is(
  (SELECT revision FROM public.atlas_studyflows WHERE user_id = auth.uid() AND branch_id = 'web-development'),
  1,
  'approval advances the persisted roadmap revision'
);
SELECT set_config(
  'test.studyflow_evidence_id',
  public.atlas_submit_studyflow_evidence('web-development', 'lesson-one', 'I built a small page and saved the source file.')::text,
  true
);
SELECT ok(current_setting('test.studyflow_evidence_id') <> '', 'the owner can submit evidence for an active roadmap lesson');
SELECT throws_ok(
  $$ SELECT public.atlas_submit_studyflow_evidence('web-development', 'not-in-roadmap', 'Some work') $$,
  'P0001',
  'Evidence target is not part of the active roadmap',
  'evidence cannot be attached to a lesson outside the active roadmap'
);
SELECT is(
  (SELECT count(*)::integer FROM public.atlas_studyflow_evidence
   WHERE user_id = auth.uid() AND item_id = 'lesson-one'),
  1,
  'submitted evidence is stored without recording an automatic mastery completion'
);
RESET ROLE;

SET LOCAL ROLE service_role;
UPDATE public.atlas_studyflows
SET status = 'awaiting_approval',
    proposal_id = 'de000000-0000-4000-8000-000000000098',
    proposed_roadmap = '{"objectives":[{"id":"goal-two","stages":[{"id":"stage-two","lessons":[{"id":"lesson-two"}]}]}]}'::jsonb
WHERE user_id = 'de000000-0000-4000-8000-000000000021'
  AND branch_id = 'web-development';
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', 'de000000-0000-4000-8000-000000000021', true);
SET LOCAL ROLE authenticated;
SELECT is(
  (public.atlas_approve_studyflow_proposal('web-development')).revision,
  2,
  'an approved roadmap revision advances without discarding the earlier one'
);
SELECT is(
  (SELECT jsonb_array_length(roadmap_history) FROM public.atlas_studyflows
   WHERE user_id = auth.uid() AND branch_id = 'web-development'),
  1,
  'the prior approved roadmap is retained in history'
);
RESET ROLE;

SET LOCAL ROLE service_role;
INSERT INTO public.atlas_studyflow_assessments
  (user_id, branch_id, roadmap_revision, evidence_id, decision, feedback, criteria_met, remaining_gaps, next_step)
VALUES (
  'de000000-0000-4000-8000-000000000021',
  'web-development',
  1,
  current_setting('test.studyflow_evidence_id')::uuid,
  'developing',
  'The submitted evidence demonstrates a first attempt.',
  ARRAY['Created a page file'],
  ARRAY['Explain the page structure'],
  'Add a heading and explain its role.'
);
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', 'de000000-0000-4000-8000-000000000021', true);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::integer FROM public.atlas_studyflow_assessments),
  1,
  'the learner can read server-saved feedback for their own evidence'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
