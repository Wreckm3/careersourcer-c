BEGIN;
SELECT plan(17);

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('de000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'credit-fixture@example.test', '', now(), '{}', '{}', now(), now());
UPDATE public.atlas_financial_controls
SET individual_daily_budget_micro_kes = 1000000000,
    global_daily_budget_micro_kes = 2500000000
WHERE id = 1;

SELECT is(public.atlas_grant_allowance(
  'de000000-0000-4000-8000-000000000001', 'builder', 'atlas-de-fixture:2026-12-24',
  now() + interval '30 days', 'subscription')->>'granted', 'true',
  'subscription allowance grant is created');
SELECT is((SELECT flexible_balance FROM public.atlas_credit_wallets
  WHERE user_id = 'de000000-0000-4000-8000-000000000001'), 240,
  'Basic flexible balance is 80 percent');
SELECT is((SELECT reserve_balance FROM public.atlas_credit_wallets
  WHERE user_id = 'de000000-0000-4000-8000-000000000001'), 60,
  'Basic protected reserve is 20 percent');
SELECT is(public.atlas_grant_allowance(
  'de000000-0000-4000-8000-000000000001', 'builder', 'atlas-de-fixture:2026-12-24',
  now() + interval '30 days', 'subscription')->>'granted', 'false',
  'duplicate allowance grant is exactly once');

SELECT is((SELECT public.atlas_reserve_request(
  'de000000-0000-4000-8000-000000000001',
  'request-concurrent-a', 'test-model', 20, 5000000)->>'reserved'), 'true',
  'first concurrent reservation succeeds');
SELECT is((SELECT public.atlas_reserve_request(
  'de000000-0000-4000-8000-000000000001',
  'request-concurrent-b', 'test-model', 20, 5000000)->>'reserved'), 'true',
  'second reservation succeeds while funded');
SELECT is((SELECT public.atlas_reserve_request(
  'de000000-0000-4000-8000-000000000001',
  'request-duplicate', 'test-model', 20, 5000000)->>'reserved'), 'true',
  'duplicate test request reserves funds');
SELECT is((SELECT public.atlas_reserve_request(
  'de000000-0000-4000-8000-000000000001',
  'request-duplicate', 'test-model', 20, 5000000)->>'duplicate'), 'true',
  'duplicate request id is idempotent');

SELECT is((SELECT public.atlas_reserve_request(
  'de000000-0000-4000-8000-000000000001',
  'request-too-large', 'test-model', 10000, 500000000)->>'reason'), 'insufficient_credits',
  'insufficient balance rejects reservation');

SELECT ok((SELECT status = 'reserved' FROM public.atlas_usage_requests
  WHERE request_id = 'request-concurrent-a'), 'reservation is recorded');
SELECT ok((SELECT count(*) = 1 FROM public.atlas_usage_requests
  WHERE request_id = 'request-duplicate'), 'duplicate settlement row is not created');

SELECT is((SELECT public.atlas_settle_request(
  (SELECT id FROM public.atlas_usage_requests WHERE request_id='request-concurrent-a'),
  'settled', 10, 2500000, 100, 100, 20, 'none')->>'unused_credits'), '10',
  'partial settlement releases unused credits');
SELECT is((SELECT public.atlas_settle_request(
  (SELECT id FROM public.atlas_usage_requests WHERE request_id='request-concurrent-a'),
  'settled', 10, 2500000, 100, 100, 20, 'none')->>'duplicate'), 'true',
  'duplicate settlement is harmless');

SELECT is((SELECT public.atlas_settle_request(
  (SELECT id FROM public.atlas_usage_requests WHERE request_id='request-concurrent-b'),
  'failed', 0, 0, 100, 0, 0, 'none')->>'unused_credits'), '20',
  'failed request releases its full reservation');
SELECT is((SELECT public.atlas_settle_request(
  (SELECT id FROM public.atlas_usage_requests WHERE request_id='request-duplicate'),
  'uncertain', 0, 0, 100, 0, 0, 'provider_uncertain')->>'reconciliation'), 'provider_uncertain',
  'uncertain provider charge is retained');

SELECT ok(NOT has_table_privilege('authenticated', 'public.atlas_credit_wallets', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.atlas_credit_ledger', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.atlas_usage_requests', 'UPDATE')
  AND NOT has_function_privilege('authenticated', 'public.atlas_grant_allowance(uuid,public.subscription_tier,text,timestamptz,text)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.atlas_reserve_request(uuid,text,text,integer,bigint)', 'EXECUTE'),
  'ordinary users cannot mutate financial state');

SELECT ok(NOT has_table_privilege('anon', 'public.atlas_credit_wallets', 'SELECT')
  AND NOT has_function_privilege('anon', 'public.atlas_reserve_request(uuid,text,text,integer,bigint)', 'EXECUTE'),
  'anonymous users cannot access credit reservations');

SELECT * FROM finish();
ROLLBACK;
