BEGIN;
SELECT plan(14);
INSERT INTO auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
VALUES
 ('ce000000-0000-4000-8000-000000000091','00000000-0000-0000-0000-000000000000','authenticated','authenticated','recovery-fixture@example.test','',now(),'{}','{}',now(),now()),
 ('ce000000-0000-4000-8000-000000000092','00000000-0000-0000-0000-000000000000','authenticated','authenticated','recovery-stripe@example.test','',now(),'{}','{}',now(),now());
INSERT INTO public.mpesa_payments(id,user_id,tier,amount_kes,phone_number,status,checkout_request_id,merchant_request_id,created_at)
VALUES
 ('ce100000-0000-4000-8000-000000000091','ce000000-0000-4000-8000-000000000091','builder',99,'254712345678','timeout','checkout-recover-1','merchant-recover-1',now()-interval '1 hour'),
 ('ce100000-0000-4000-8000-000000000092','ce000000-0000-4000-8000-000000000091','builder',99,'254712345678','pending','checkout-recover-2','merchant-recover-2',now()),
 ('ce100000-0000-4000-8000-000000000093','ce000000-0000-4000-8000-000000000092','builder',99,'254712345678','unknown','checkout-recover-3','merchant-recover-3',now()-interval '1 hour');
SELECT throws_ok($$SELECT public.recover_mpesa_payment('ce100000-0000-4000-8000-000000000091','checkout-recover-1','merchant-recover-1','REC091',99,'254712345678','')$$,'P0001','INVALID_MPESA_RECOVERY_EVIDENCE','missing evidence rejected');
SELECT is(public.recover_mpesa_payment('ce100000-0000-4000-8000-000000000091','wrong','merchant-recover-1','REC091',99,'254712345678','ticket-1')->>'reason','evidence_mismatch','wrong checkout rejected');
SELECT is(public.recover_mpesa_payment('ce100000-0000-4000-8000-000000000091','checkout-recover-1','merchant-recover-1','REC091',98,'254712345678','ticket-1')->>'reason','evidence_mismatch','wrong amount rejected');
SELECT is(public.recover_mpesa_payment('ce100000-0000-4000-8000-000000000092','checkout-recover-2','merchant-recover-2','REC092',99,'254712345678','ticket-2')->>'reason','payment_not_stale','fresh pending payment not reopened');
SELECT is(public.recover_mpesa_payment('ce100000-0000-4000-8000-000000000091','checkout-recover-1','merchant-recover-1','rec091',99,'254712345678','ticket-1')->>'recovered','true','verified timed-out payment recovered');
SELECT is((SELECT status FROM public.mpesa_payments WHERE id='ce100000-0000-4000-8000-000000000091'),'success','payment marked success');
SELECT is((SELECT tier::text FROM public.subscriptions WHERE user_id='ce000000-0000-4000-8000-000000000091'),'builder','correct subscription activated');
SELECT is((SELECT previous_status FROM public.mpesa_payment_recoveries WHERE payment_id='ce100000-0000-4000-8000-000000000091'),'timeout','original status recorded');
SELECT is(public.recover_mpesa_payment('ce100000-0000-4000-8000-000000000091','checkout-recover-1','merchant-recover-1','REC091',99,'254712345678','ticket-1')->>'reason','already_fulfilled','repeat recovery cannot extend access');
UPDATE public.mpesa_payments SET created_at=now()-interval '1 hour' WHERE id='ce100000-0000-4000-8000-000000000092';
SELECT is(public.recover_mpesa_payment('ce100000-0000-4000-8000-000000000092','checkout-recover-2','merchant-recover-2','rec091',99,'254712345678','ticket-2')->>'reason','receipt_already_used','receipt reuse blocked');
UPDATE public.subscriptions SET tier='elite',status='active',provider='stripe',provider_subscription_id='sub_recovery_guard',current_period_start=now(),current_period_end=now()+interval '30 days' WHERE user_id='ce000000-0000-4000-8000-000000000092';
SELECT is(public.recover_mpesa_payment('ce100000-0000-4000-8000-000000000093','checkout-recover-3','merchant-recover-3','REC093',99,'254712345678','ticket-3')->>'reason','active_stripe_entitlement','active Stripe subscription protected');
SELECT is((SELECT status FROM public.mpesa_payments WHERE id='ce100000-0000-4000-8000-000000000093'),'unknown','blocked payment remains unresolved');
SELECT ok(NOT has_function_privilege('authenticated','public.recover_mpesa_payment(uuid,text,text,text,integer,text,text)','EXECUTE') AND NOT has_function_privilege('anon','public.recover_mpesa_payment(uuid,text,text,text,integer,text,text)','EXECUTE'),'recovery RPC is service-only');
SELECT ok(NOT has_table_privilege('authenticated','public.mpesa_payment_recoveries','SELECT') AND NOT has_table_privilege('service_role','public.mpesa_payment_recoveries','UPDATE'),'recovery audit restricted');
SELECT * FROM finish();
ROLLBACK;
