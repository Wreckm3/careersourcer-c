BEGIN;
SELECT plan(16);
INSERT INTO auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
VALUES ('de000000-0000-4000-8000-000000000097','00000000-0000-0000-0000-000000000000','authenticated','authenticated','renewal-fixture@example.test','',now(),'{}','{}',now(),now());
SELECT set_config('request.jwt.claim.sub','de000000-0000-4000-8000-000000000097',true);
UPDATE public.atlas_financial_controls SET emergency_shutdown=false,individual_daily_budget_micro_kes=1000000000,global_daily_budget_micro_kes=2500000000 WHERE id=1;
SELECT is(public.ensure_atlas_allowance()->>'available','20','initial lifetime trial');
SELECT is(public.atlas_reserve_request('de000000-0000-4000-8000-000000000097','trial-spent','fixture',5,1)->>'reserved','true','trial credits consumed');
SELECT is(public.ensure_atlas_allowance()->>'available','15','repeated trial call does not replenish');
-- Create a valid quarterly entitlement, currently in its second monthly slice.
-- Fixed UTC day 1 avoids date-clipping ambiguity regardless of the runner date.
INSERT INTO public.subscriptions(user_id,tier,status,provider,current_period_start,current_period_end,billing_interval,billing_interval_count)
VALUES ('de000000-0000-4000-8000-000000000097','builder','active','stripe',date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - interval '1 month',date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' + interval '2 months','month',3)
ON CONFLICT(user_id) DO UPDATE SET tier=EXCLUDED.tier,status=EXCLUDED.status,provider=EXCLUDED.provider,current_period_start=EXCLUDED.current_period_start,current_period_end=EXCLUDED.current_period_end,billing_interval=EXCLUDED.billing_interval,billing_interval_count=EXCLUDED.billing_interval_count;
-- Mimic the old implementation's first-month wallet and pre-created next grant.
SELECT public.atlas_grant_allowance('de000000-0000-4000-8000-000000000097','builder','atlas:de000000-0000-4000-8000-000000000097:'||to_char(date_trunc('month',now() AT TIME ZONE 'UTC')-interval '1 month','YYYY-MM'),now()+interval '1 day','subscription');
INSERT INTO public.atlas_allowance_grants(user_id,period_key,config_version,tier,flexible_granted,reserve_granted,grant_type)
VALUES ('de000000-0000-4000-8000-000000000097','atlas:de000000-0000-4000-8000-000000000097:'||to_char(now() AT TIME ZONE 'UTC','YYYY-MM'),1,'builder',240,60,'subscription');
UPDATE public.atlas_credit_wallets SET flexible_balance=3,reserve_balance=2,purchased_balance=7,promotional_balance=2 WHERE user_id='de000000-0000-4000-8000-000000000097';
SELECT is(public.ensure_atlas_allowance()->>'period_key','atlas:de000000-0000-4000-8000-000000000097:'||to_char(now() AT TIME ZONE 'UTC','YYYY-MM'),'quarterly second slice activates');
SELECT is(public.ensure_atlas_allowance()->>'flexible','240','monthly flexible credits replenish');
SELECT is(public.ensure_atlas_allowance()->>'reserve','60','monthly reserve credits replenish');
SELECT is(public.ensure_atlas_allowance()->>'purchased','7','purchased credits survive rollover');
SELECT is(public.ensure_atlas_allowance()->>'promotional','2','promotional credits survive rollover');
SELECT is((public.ensure_atlas_allowance()->>'renewal_at')::timestamptz,(date_trunc('month',now() AT TIME ZONE 'UTC')+interval '1 month') AT TIME ZONE 'UTC','renewal is next monthly anniversary not quarterly end');
SELECT is(public.atlas_reserve_request('de000000-0000-4000-8000-000000000097','paid-spent','fixture',20,1)->>'reserved','true','paid request consumes 9 carryover and 11 flexible credits');
SELECT is(public.ensure_atlas_allowance()->>'available','289','repeat call does not replenish paid balance');
UPDATE public.subscriptions SET status='canceled' WHERE user_id='de000000-0000-4000-8000-000000000097';
SELECT is(public.ensure_atlas_allowance()->>'available','15','canceled plan restores only remaining lifetime trial');
UPDATE public.subscriptions SET status='active' WHERE user_id='de000000-0000-4000-8000-000000000097';
SELECT is(public.ensure_atlas_allowance()->>'available','289','return to same paid period does not duplicate spent credits');
UPDATE public.subscriptions SET current_period_end=now()-interval '1 second' WHERE user_id='de000000-0000-4000-8000-000000000097';
SELECT is(public.ensure_atlas_allowance()->>'available','15','expired paid period returns to existing trial');
UPDATE public.subscriptions SET current_period_start=now()+interval '1 day',current_period_end=now()+interval '1 month' WHERE user_id='de000000-0000-4000-8000-000000000097';
SELECT is(public.ensure_atlas_allowance()->>'available','15','future paid entitlement cannot activate early');
SELECT ok(NOT has_function_privilege('anon','public.ensure_atlas_allowance()','EXECUTE') AND has_function_privilege('authenticated','public.ensure_atlas_allowance()','EXECUTE'),'only authenticated callers can provision their own wallet');
SELECT * FROM finish();
ROLLBACK;
