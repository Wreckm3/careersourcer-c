BEGIN;
SELECT plan(6);
INSERT INTO auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
 ('de000000-0000-4000-8000-000000000031','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mastery-one@example.test','',now(),'{}','{}',now(),now()),
 ('de000000-0000-4000-8000-000000000032','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mastery-two@example.test','',now(),'{}','{}',now(),now());
INSERT INTO public.atlas_studyflow_evidence(user_id, branch_id, roadmap_revision, item_id, evidence_text, created_at)
SELECT 'de000000-0000-4000-8000-000000000031', 'web-development', 2, 'lesson-' || n, 'Practice evidence', now() - interval '1 day'
FROM generate_series(1,20) AS n;
INSERT INTO public.atlas_studyflow_assessments(user_id, branch_id, roadmap_revision, evidence_id, decision, feedback, next_step)
SELECT user_id, branch_id, roadmap_revision, id, 'criteria_met', 'Criteria met', 'Continue'
FROM public.atlas_studyflow_evidence WHERE user_id = 'de000000-0000-4000-8000-000000000031';
INSERT INTO public.atlas_studyflow_evidence(user_id, branch_id, roadmap_revision, item_id, evidence_text, created_at)
VALUES ('de000000-0000-4000-8000-000000000031','web-development',2,'lesson-1','New attempt',now()),
       ('de000000-0000-4000-8000-000000000031','web-development',1,'lesson-old','Old revision',now());
SELECT ok(NOT has_function_privilege('anon','public.atlas_studyflow_mastery_snapshot(text,integer)','EXECUTE'),'anonymous callers cannot read mastery snapshots');
SELECT set_config('request.jwt.claim.sub','de000000-0000-4000-8000-000000000031',true);
SET LOCAL ROLE authenticated;
SELECT is(jsonb_array_length(public.atlas_studyflow_mastery_snapshot('web-development',2)->'evidence'),20,'every lesson is represented beyond the old twelve-row limit');
SELECT is(jsonb_array_length(public.atlas_studyflow_mastery_snapshot('web-development',2)->'assessments'),19,'older assessment cannot certify a new submission');
SELECT is((SELECT item->>'evidence_text' FROM jsonb_array_elements(public.atlas_studyflow_mastery_snapshot('web-development',2)->'evidence') AS item WHERE item->>'item_id'='lesson-1'),'New attempt','latest attempt is selected per lesson');
SELECT is(jsonb_array_length(public.atlas_studyflow_mastery_snapshot('web-development',1)->'evidence'),1,'revision-specific data remains distinct');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','de000000-0000-4000-8000-000000000032',true);
SET LOCAL ROLE authenticated;
SELECT is(public.atlas_studyflow_mastery_snapshot('web-development',2),'{"evidence":[],"assessments":[]}'::jsonb,'other learners cannot access private mastery data');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
