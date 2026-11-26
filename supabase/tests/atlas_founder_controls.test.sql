BEGIN;
SELECT plan(16);
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('de000000-0000-4000-8000-000000000081','00000000-0000-0000-0000-000000000000','authenticated','authenticated','atlas-operator@example.test','',now(),'{}','{}',now(),now()),
  ('de000000-0000-4000-8000-000000000082','00000000-0000-0000-0000-000000000000','authenticated','authenticated','atlas-founder-only@example.test','',now(),'{}','{}',now(),now()),
  ('de000000-0000-4000-8000-000000000083','00000000-0000-0000-0000-000000000000','authenticated','authenticated','atlas-regular@example.test','',now(),'{}','{}',now(),now());
INSERT INTO public.founder_atlas_entitlements(user_id) VALUES
  ('de000000-0000-4000-8000-000000000081'), ('de000000-0000-4000-8000-000000000082');
INSERT INTO public.atlas_founder_operators(user_id) VALUES ('de000000-0000-4000-8000-000000000081');
UPDATE public.atlas_financial_controls SET emergency_shutdown = false, global_daily_budget_micro_kes = 9000000, individual_daily_budget_micro_kes = 1000000 WHERE id = 1;
INSERT INTO public.atlas_usage_requests(request_id,user_id,period_key,model,status,reserved_credits,reserved_budget_micro_kes,actual_credits,actual_budget_micro_kes,created_at)
VALUES
  ('founder-settled','de000000-0000-4000-8000-000000000083','fixture','fixture','settled',4,800000,3,600000,now()),
  ('founder-reserved','de000000-0000-4000-8000-000000000083','fixture','fixture','reserved',2,400000,0,0,now()),
  ('founder-old-uncertain','de000000-0000-4000-8000-000000000083','fixture','fixture','uncertain',1,200000,1,200000,date_trunc('month',now())-interval '1 second'),
  ('founder-failed','de000000-0000-4000-8000-000000000083','fixture','fixture','failed',1,100000,0,0,now());
SELECT ok(NOT has_table_privilege('authenticated','public.atlas_founder_operators','INSERT') AND NOT has_table_privilege('authenticated','public.atlas_founder_control_events','INSERT') AND NOT has_table_privilege('authenticated','public.atlas_financial_controls','UPDATE'), 'clients cannot provision operators, forge audit rows, or mutate financial controls');
SELECT ok(NOT has_function_privilege('anon','public.atlas_founder_control_snapshot()','EXECUTE') AND NOT has_function_privilege('anon','public.atlas_founder_pause_generation()','EXECUTE'), 'anonymous callers cannot execute operator RPCs');
SELECT set_config('request.jwt.claim.sub','de000000-0000-4000-8000-000000000083',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$ SELECT public.atlas_founder_control_snapshot() $$,'42501','ATLAS_OPERATOR_REQUIRED','ordinary users cannot read aggregate usage');
SELECT throws_ok($$ SELECT public.atlas_founder_pause_generation() $$,'42501','ATLAS_OPERATOR_REQUIRED','ordinary users cannot pause generation');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','de000000-0000-4000-8000-000000000082',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$ SELECT public.atlas_founder_control_snapshot() $$,'42501','ATLAS_OPERATOR_REQUIRED','founder mentorship alone cannot read controls');
SELECT throws_ok($$ SELECT public.atlas_founder_pause_generation() $$,'42501','ATLAS_OPERATOR_REQUIRED','founder mentorship alone cannot pause');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','de000000-0000-4000-8000-000000000081',true);
SET LOCAL ROLE authenticated;
SELECT is(public.atlas_founder_control_snapshot()->>'daily_accounted_micro_kes','1000000','today accounts for both settled and reserved estimates');
SELECT is(public.atlas_founder_control_snapshot()->>'monthly_settled_estimate_micro_kes','600000','settled monthly estimate excludes reservations');
SELECT is(public.atlas_founder_control_snapshot()->>'outstanding_micro_kes','600000','all-age unresolved estimate includes previous month');
SELECT is(public.atlas_founder_control_snapshot()->>'uncertain_count','1','uncertain requests counted separately');
SELECT is(public.atlas_founder_pause_generation(),true,'authorized operator can pause generation');
SELECT is(public.atlas_founder_control_snapshot()->>'emergency_shutdown','true','server snapshot confirms pause');
SELECT is(public.atlas_founder_pause_generation(),true,'repeat pause is idempotent');
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.atlas_founder_control_events WHERE action = 'pause_generation'),1,'exactly one audit event per pause transition');
SELECT is(public.atlas_reserve_request('de000000-0000-4000-8000-000000000083','founder-new-after-pause','fixture',1,1000)->>'reason','generation_unavailable','pause denies new reservations');
DELETE FROM public.founder_atlas_entitlements WHERE user_id = 'de000000-0000-4000-8000-000000000081';
SET LOCAL ROLE authenticated;
SELECT throws_ok($$ SELECT public.atlas_founder_control_snapshot() $$,'42501','ATLAS_OPERATOR_REQUIRED','revoking founder entitlement revokes operator access');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
