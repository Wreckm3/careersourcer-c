BEGIN;
SELECT plan(12);
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
 ('de000000-0000-4000-8000-000000000092','00000000-0000-0000-0000-000000000000','authenticated','authenticated','budget-fixture@example.test','',now(),'{}','{}',now(),now()),
 ('de000000-0000-4000-8000-000000000093','00000000-0000-0000-0000-000000000000','authenticated','authenticated','budget-fixture-two@example.test','',now(),'{}','{}',now(),now());
UPDATE public.atlas_financial_controls SET emergency_shutdown=false, individual_daily_budget_micro_kes=1000000000, global_daily_budget_micro_kes=2500000000 WHERE id=1;
SELECT public.atlas_grant_allowance('de000000-0000-4000-8000-000000000092','builder','budget-fixture',now()+interval '30 days','subscription');
INSERT INTO public.atlas_verified_metering_rates(model,input_rate,cached_rate,output_rate,input_token_ceiling,verified_until,source)
VALUES ('budget-fixture-model',10000000000,0,10000000000,1024,now()+interval '1 day','synthetic test only');
-- Each 100-output-token reservation costs 11,240,000 micro-KES.
SELECT is(public.atlas_reserve_metered_request('de000000-0000-4000-8000-000000000093','no-grant','budget-fixture-model',1,100)->>'reason','budget_unavailable','no grant fails closed');
SELECT is(public.atlas_reserve_metered_request('de000000-0000-4000-8000-000000000092','first','budget-fixture-model',1,100)->>'reserved','true','first reservation within monthly cap');
SELECT is(public.atlas_reserve_metered_request('de000000-0000-4000-8000-000000000092','first','budget-fixture-model',1,100)->>'duplicate','true','duplicate does not reserve again');
SELECT is(public.atlas_reserve_metered_request('de000000-0000-4000-8000-000000000092','second','budget-fixture-model',1,100)->>'reserved','true','second reservation within monthly cap');
SELECT is(public.atlas_reserve_metered_request('de000000-0000-4000-8000-000000000092','third','budget-fixture-model',1,100)->>'reason','monthly_spending_limit','third would exceed builder monthly cap');
SELECT is((SELECT count(*) FROM public.atlas_usage_requests WHERE user_id='de000000-0000-4000-8000-000000000092'),2::bigint,'denied request creates no usage row');
SELECT is(public.atlas_settle_metered_request((SELECT id FROM public.atlas_usage_requests WHERE user_id='de000000-0000-4000-8000-000000000092' AND request_id='second'),false,NULL,NULL,NULL,NULL)->>'status','failed','undispatched failure releases reservation');
UPDATE public.atlas_usage_requests SET created_at=date_trunc('month',now())-interval '1 day' WHERE user_id='de000000-0000-4000-8000-000000000092' AND request_id='first';
SELECT is(public.atlas_reserve_metered_request('de000000-0000-4000-8000-000000000092','after-boundary','budget-fixture-model',1,100)->>'reserved','true','prior-month reservation counted but room remains');
SELECT is(public.atlas_reserve_metered_request('de000000-0000-4000-8000-000000000092','over-boundary','budget-fixture-model',1,100)->>'reason','monthly_spending_limit','prior-month outstanding reservation still counts');
SELECT public.atlas_grant_allowance('de000000-0000-4000-8000-000000000093','builder','budget-fixture-two',now()+interval '30 days','subscription');
UPDATE public.atlas_financial_controls SET global_daily_budget_micro_kes=30000000 WHERE id=1;
SELECT is(public.atlas_reserve_metered_request('de000000-0000-4000-8000-000000000093','global-denied','budget-fixture-model',1,100)->>'reason','spending_limit','global daily cap counts prior-day outstanding cost across users');
UPDATE public.atlas_financial_controls SET emergency_shutdown=true WHERE id=1;
SELECT is(public.atlas_reserve_metered_request('de000000-0000-4000-8000-000000000093','paused','budget-fixture-model',1,100)->>'reason','generation_unavailable','shutdown remains enforced');
SELECT ok(NOT has_function_privilege('authenticated','public.atlas_reserve_metered_request(uuid,text,text,integer,integer)','EXECUTE') AND NOT has_function_privilege('anon','public.atlas_reserve_metered_request(uuid,text,text,integer,integer)','EXECUTE'),'metered entry point remains private');
SELECT * FROM finish();
ROLLBACK;
