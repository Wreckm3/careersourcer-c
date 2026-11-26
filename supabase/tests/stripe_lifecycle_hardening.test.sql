BEGIN;
SELECT plan(15);
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
VALUES ('be000000-0000-4000-8000-000000000099','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stripe-lifecycle-fixture@example.test','',now(),'{}','{}',now(),now());
CREATE FUNCTION pg_temp.invoice_event(e text,i text,at_time bigint,starts timestamptz,ends timestamptz)
RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('event_id',e,'event_type','invoice.paid','event_created',at_time,'kind','payment',
  'user_id','be000000-0000-4000-8000-000000000099','tier','builder','customer_id','cus_lifecycle_fixture',
  'subscription_id','sub_lifecycle_fixture','paid',true,'invoice_id',i,'charge_id','ch_'||i,
  'payment_intent_id','pi_'||i,'amount',297,'currency','usd','period_start',starts,'period_end',ends,'interval','month','interval_count',1);
$$;
CREATE FUNCTION pg_temp.lifecycle_event(e text,s text,t bigint,c boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('event_id',e,'event_type','customer.subscription.updated','event_created',t,
 'kind','subscription','user_id','be000000-0000-4000-8000-000000000099','subscription_id','sub_lifecycle_fixture','status',s,'cancel_at_period_end',c); $$;
CREATE FUNCTION pg_temp.refund_event(e text,r text,i text,t bigint,a integer)
RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('event_id',e,'event_type','refund.updated','event_created',t,'kind','refund',
 'charge_id','ch_'||i,'refund_id',r,'amount',a,'currency','usd'); $$;
SELECT is(public.fulfill_stripe_event(pg_temp.invoice_event('evt_lh_1','in_lh_old',1893456000,'2030-01-01 UTC','2030-02-01 UTC')),'processed','first verified invoice is processed');
SELECT is(public.fulfill_stripe_event(pg_temp.invoice_event('evt_lh_2','in_lh_current',1896134400,'2030-02-01 UTC','2030-03-01 UTC')),'processed','next verified invoice is processed');
SELECT is(public.fulfill_stripe_event(pg_temp.refund_event('evt_lh_old_refund','re_lh_old','in_lh_old',1896134401,297)),'processed','historical refund is processed');
SELECT is((SELECT refunded_minor FROM public.stripe_payment_records WHERE invoice_id='in_lh_old'),297::bigint,'historical refund still updates financial ledger');
SELECT is((SELECT status::text FROM public.subscriptions WHERE user_id='be000000-0000-4000-8000-000000000099'),'active','historical refund does not revoke newer paid period');
SELECT is(public.fulfill_stripe_event(pg_temp.lifecycle_event('evt_lh_schedule','active',1896134402,true)),'processed','active lifecycle metadata is processed');
SELECT ok((SELECT cancel_at_period_end FROM public.subscriptions WHERE user_id='be000000-0000-4000-8000-000000000099'),'cancellation schedule is recorded without immediate revocation');
SELECT is(public.fulfill_stripe_event(pg_temp.refund_event('evt_lh_current_refund','re_lh_current','in_lh_current',1896134403,297)),'processed','full current-period refund is processed');
SELECT is((SELECT status::text FROM public.subscriptions WHERE user_id='be000000-0000-4000-8000-000000000099'),'canceled','full refund revokes current entitlement');
SELECT is(public.fulfill_stripe_event(pg_temp.lifecycle_event('evt_lh_reactivate','active',1896134404)),'processed','later active lifecycle notification is accepted as metadata');
SELECT is((SELECT status::text FROM public.subscriptions WHERE user_id='be000000-0000-4000-8000-000000000099'),'canceled','active lifecycle notification cannot restore refunded entitlement');
SELECT is(public.fulfill_stripe_event(pg_temp.invoice_event('evt_lh_3','in_lh_next',1898553600,'2030-03-01 UTC','2030-04-01 UTC')),'processed','new verified invoice can restore entitlement');
SELECT is((SELECT status::text FROM public.subscriptions WHERE user_id='be000000-0000-4000-8000-000000000099'),'active','newly paid period restores access');
SELECT is(public.fulfill_stripe_event(pg_temp.lifecycle_event('evt_lh_pause','paused',1898553601)),'processed','paused lifecycle event is handled');
SELECT ok((SELECT status::text='past_due' FROM public.subscriptions WHERE user_id='be000000-0000-4000-8000-000000000099') AND NOT has_function_privilege('service_role','public.atlas_fulfill_stripe_event_v1(jsonb)','EXECUTE') AND NOT has_function_privilege('authenticated','public.fulfill_stripe_event(jsonb)','EXECUTE'),'pause suspends access and private implementation cannot be called by ordinary backend RPC');
SELECT * FROM finish();
ROLLBACK;
