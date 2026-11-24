BEGIN;
SELECT plan(19);

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('ce000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'mpesa-fixture@example.test', '', now(), '{}', '{}', now(), now());

INSERT INTO public.mpesa_payments
  (id, user_id, tier, amount_kes, phone_number, status, checkout_request_id, currency)
VALUES ('ce100000-0000-4000-8000-000000000001',
  'ce000000-0000-4000-8000-000000000001', 'professional', 299,
  '254712345678', 'pending', 'wsCO_fixture', 'KES');

SELECT is(public.mpesa_plan_amount('builder'), 99, 'builder amount is server-confirmed');
SELECT is(public.mpesa_plan_amount('professional'), 299, 'professional amount is server-confirmed');
SELECT is(public.mpesa_plan_amount('elite'), 499, 'elite amount is server-confirmed');

SELECT is(public.finalize_mpesa_payment(
  'ce100000-0000-4000-8000-000000000001', 'success', 'ABC123', 0, 'Success',
  '{}'::jsonb, '20261124000100', '254712345678', 299), true,
  'verified successful callback activates M-Pesa entitlement');
SELECT is((SELECT status FROM public.mpesa_payments WHERE id = 'ce100000-0000-4000-8000-000000000001'),
  'success', 'payment ledger is success');
SELECT is((SELECT provider FROM public.subscriptions WHERE user_id = 'ce000000-0000-4000-8000-000000000001'),
  'mpesa', 'subscription provider is M-Pesa');
SELECT is((SELECT tier FROM public.subscriptions WHERE user_id = 'ce000000-0000-4000-8000-000000000001'),
  'professional', 'subscription tier is retained');
SELECT ok((SELECT current_period_end > now() FROM public.subscriptions WHERE user_id = 'ce000000-0000-4000-8000-000000000001'),
  'successful payment creates a future paid period');
SELECT is(public.finalize_mpesa_payment(
  'ce100000-0000-4000-8000-000000000001', 'success', 'ABC123', 0, 'Duplicate',
  '{}'::jsonb, '20261124000100', '254712345678', 299), false,
  'duplicate callback does not reprocess payment');
SELECT is((SELECT count(*)::integer FROM public.mpesa_payments WHERE mpesa_receipt_number = 'ABC123'), 1,
  'receipt is unique and duplicate-safe');

INSERT INTO public.mpesa_payments
  (id, user_id, tier, amount_kes, phone_number, status, checkout_request_id)
VALUES ('ce100000-0000-4000-8000-000000000002',
  'ce000000-0000-4000-8000-000000000001', 'professional', 299,
  '254712345678', 'pending', 'wsCO_wrong_amount');
SELECT is(public.finalize_mpesa_payment(
  'ce100000-0000-4000-8000-000000000002', 'success', 'ABC124', 0, 'Success',
  '{}'::jsonb, '20261124000100', '254712345678', 298), false,
  'wrong amount is rejected');
SELECT is((SELECT status FROM public.mpesa_payments WHERE id = 'ce100000-0000-4000-8000-000000000002'),
  'unknown', 'mismatched callback is not marked successful');

INSERT INTO public.mpesa_payments
  (id, user_id, tier, amount_kes, phone_number, status, checkout_request_id)
VALUES ('ce100000-0000-4000-8000-000000000003',
  'ce000000-0000-4000-8000-000000000001', 'professional', 299,
  '254712345678', 'pending', 'wsCO_cancelled');
SELECT is(public.finalize_mpesa_payment(
  'ce100000-0000-4000-8000-000000000003', 'cancelled', NULL, 1032, 'Cancelled',
  '{}'::jsonb), true, 'cancelled callback is finalized');
SELECT is((SELECT status FROM public.mpesa_payments WHERE id = 'ce100000-0000-4000-8000-000000000003'),
  'cancelled', 'cancelled status is retained');

INSERT INTO public.mpesa_payments
  (id, user_id, tier, amount_kes, phone_number, status, checkout_request_id)
VALUES ('ce100000-0000-4000-8000-000000000004',
  'ce000000-0000-4000-8000-000000000001', 'elite', 499,
  '254712345678', 'pending', 'wsCO_stripe_guard');
INSERT INTO public.subscriptions
  (user_id, tier, status, provider, provider_subscription_id, current_period_end)
VALUES ('ce000000-0000-4000-8000-000000000001', 'elite', 'active', 'stripe',
  'sub_stripe_guard', now() + interval '30 days');
SELECT is(public.finalize_mpesa_payment(
  'ce100000-0000-4000-8000-000000000004', 'success', 'ABC125', 0, 'Success',
  '{}'::jsonb, '20261124000100', '254712345678', 499), false,
  'M-Pesa cannot override a valid Stripe entitlement');

SELECT ok(NOT has_table_privilege('authenticated', 'public.mpesa_payments', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.mpesa_payments', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.subscriptions', 'UPDATE'),
  'authenticated users cannot mutate M-Pesa or subscription financial state');
SELECT ok(NOT has_function_privilege('authenticated', 'public.finalize_mpesa_payment(UUID,TEXT,TEXT,INTEGER,TEXT,JSONB,TEXT,TEXT,INTEGER)', 'EXECUTE'),
  'authenticated users cannot call M-Pesa settlement');

SELECT ok(NOT has_table_privilege('anon', 'public.mpesa_payments', 'SELECT')
  AND NOT has_function_privilege('anon', 'public.finalize_mpesa_payment(UUID,TEXT,TEXT,INTEGER,TEXT,JSONB,TEXT,TEXT,INTEGER)', 'EXECUTE'),
  'anonymous users cannot access or settle M-Pesa payments');
SELECT throws_ok($$ SELECT public.finalize_mpesa_payment(
  'ce100000-0000-4000-8000-000000000003', 'invalid', NULL, 1, 'Invalid', '{}'::jsonb) $$,
  'P0001', 'Invalid M-Pesa settlement status',
  'invalid settlement status is rejected');

SELECT * FROM finish();
ROLLBACK;
