BEGIN;
SELECT plan(37);

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('be000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'stripe-fixture@example.test', '', now(), '{}', '{}', now(), now());

CREATE FUNCTION pg_temp.payment_event(id text, invoice text, event_time integer, period_end text, interval_count integer)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('event_id', id, 'event_type', 'invoice.paid', 'event_created', event_time,
    'kind', 'payment', 'user_id', 'be000000-0000-4000-8000-000000000001', 'tier', 'builder',
    'customer_id', 'cus_fixture', 'subscription_id', 'sub_fixture', 'paid', true,
    'invoice_id', invoice, 'charge_id', 'ch_' || invoice, 'payment_intent_id', 'pi_' || invoice,
    'amount', 297, 'currency', 'usd', 'period_start', '2030-01-01T00:00:00Z',
    'period_end', period_end, 'interval', 'month', 'interval_count', interval_count);
$$;

SELECT is(public.fulfill_stripe_event(pg_temp.payment_event('evt_1', 'in_1', 1893456000, '2030-04-01T00:00:00Z', 3)),
  'processed', 'verified quarterly payment is fulfilled');
SELECT is(public.fulfill_stripe_event(pg_temp.payment_event('evt_1', 'in_1', 1893456000, '2030-04-01T00:00:00Z', 3)),
  'duplicate', 'duplicate delivery is idempotent');
SELECT is((SELECT count(*)::integer FROM public.stripe_payment_records WHERE invoice_id = 'in_1'), 1,
  'duplicate delivery creates one payment record');
SELECT is((SELECT amount_minor FROM public.stripe_payment_records WHERE invoice_id = 'in_1'), 297::bigint,
  'verified minor-unit amount is recorded');
SELECT is((SELECT currency FROM public.stripe_payment_records WHERE invoice_id = 'in_1'), 'usd',
  'verified currency is recorded');
SELECT is((SELECT billing_interval_count FROM public.subscriptions WHERE user_id = 'be000000-0000-4000-8000-000000000001'), 3,
  'quarterly interval is retained');
SELECT is((SELECT current_period_end FROM public.subscriptions WHERE user_id = 'be000000-0000-4000-8000-000000000001'),
  '2030-04-01T00:00:00Z'::timestamptz, 'paid-through date is retained');

SELECT throws_ok($$ SELECT public.fulfill_stripe_event(pg_temp.payment_event('evt_bad', 'in_bad', 1893456001, '2030-04-01T00:00:00Z', 3) || '{"paid":false}'::jsonb) $$,
  'P0001', 'Invalid verified Stripe payment', 'unpaid event cannot activate access');
SELECT is((SELECT count(*)::integer FROM public.payment_events WHERE provider_event_id = 'evt_bad'), 0,
  'failed fulfillment rolls back its event receipt');
SELECT is(public.fulfill_stripe_event(pg_temp.payment_event('evt_bad', 'in_bad', 1893456001, '2030-04-01T00:00:00Z', 3)),
  'processed', 'corrected delivery can retry after failure');

SELECT is(public.fulfill_stripe_event(jsonb_build_object('event_id','evt_cancel','event_type','customer.subscription.deleted',
  'event_created',1893456010,'kind','subscription','user_id','be000000-0000-4000-8000-000000000001',
  'subscription_id','sub_fixture','status','canceled')), 'processed', 'cancellation is processed');
SELECT is(public.fulfill_stripe_event(pg_temp.payment_event('evt_old', 'in_old', 1893456002, '2030-04-01T00:00:00Z', 3)),
  'processed', 'older payment remains auditable');
SELECT is((SELECT status::text FROM public.subscriptions WHERE user_id = 'be000000-0000-4000-8000-000000000001'),
  'canceled', 'out-of-order older event cannot reactivate subscription');

SELECT is(public.fulfill_stripe_event(jsonb_build_object('event_id','evt_refund','event_type','charge.refunded',
  'event_created',1893456020,'kind','refund','charge_id','ch_in_1','refund_id','re_full','amount',297,'currency','usd')),
  'processed', 'refund is matched to its charge');
SELECT is((SELECT reconciliation_status FROM public.stripe_payment_records WHERE invoice_id = 'in_1'), 'full_refund',
  'full refund is independently reconciled');

SELECT is(public.fulfill_stripe_event(pg_temp.payment_event('evt_dispute_payment','in_2',1893456021,'2030-04-01T00:00:00Z',3)),
  'processed', 'independent dispute payment is fulfilled');
SELECT is(public.fulfill_stripe_event(jsonb_build_object('event_id','evt_dispute','event_type','charge.dispute.created',
  'event_created',1893456022,'kind','dispute','payment_intent_id','pi_in_2','dispute_id','dp_full','amount',297,'currency','usd','status','needs_response')),
  'processed', 'dispute is matched to an independent payment intent');
SELECT is((SELECT count(*)::integer FROM public.stripe_payment_adjustments WHERE event_id IN ('evt_refund','evt_dispute')), 2,
  'refund and dispute adjustments remain separately auditable');
SELECT ok(NOT has_table_privilege('authenticated', 'public.stripe_payment_records', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.stripe_payment_adjustments', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.payment_events', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.payment_transactions', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.subscriptions', 'UPDATE'),
  'authenticated users cannot modify financial records');
SELECT ok(NOT has_function_privilege('authenticated', 'public.fulfill_stripe_event(jsonb)', 'EXECUTE'),
  'authenticated users cannot call the fulfillment function');

SELECT is(public.fulfill_stripe_event(pg_temp.payment_event('evt_partial_payment','in_3',1893456029,'2030-04-01T00:00:00Z',3)),
  'processed', 'independent partial-refund payment is fulfilled');
SELECT is(public.fulfill_stripe_event(jsonb_build_object('event_id','evt_partial_1','event_type','refund.updated',
  'event_created',1893456030,'kind','refund','charge_id','ch_in_3','refund_id','re_partial_1','amount',100,'currency','usd')),
  'processed', 'first partial refund is processed');
SELECT is(public.fulfill_stripe_event(jsonb_build_object('event_id','evt_partial_2','event_type','refund.updated',
  'event_created',1893456031,'kind','refund','charge_id','ch_in_3','refund_id','re_partial_2','amount',197,'currency','usd')),
  'processed', 'partial refunds reaching the original amount are processed');
SELECT is((SELECT refunded_minor FROM public.stripe_payment_records WHERE invoice_id = 'in_3'), 297::bigint,
  'cumulative refund amount is capped at the original payment');
SELECT is((SELECT reconciliation_status FROM public.stripe_payment_records WHERE invoice_id = 'in_3'), 'full_refund',
  'full refund reconciliation is recorded');

SELECT is(public.fulfill_stripe_event(jsonb_build_object('event_id','evt_dispute_open','event_type','charge.dispute.created',
  'event_created',1893456040,'kind','dispute','charge_id','ch_in_2','dispute_id','dp_open','amount',239,'currency','usd','status','open')),
  'processed', 'open dispute is processed');
SELECT is((SELECT status FROM public.stripe_dispute_reconciliation WHERE dispute_id = 'dp_open'), 'open',
  'open dispute remains suspended');

SELECT is(public.fulfill_stripe_event(jsonb_build_object('event_id','evt_dispute_won','event_type','charge.dispute.closed',
  'event_created',1893456041,'kind','dispute','charge_id','ch_in_2','dispute_id','dp_open','amount',239,'currency','usd','status','won')),
  'processed', 'won dispute transition is processed');
SELECT is((SELECT status FROM public.stripe_dispute_reconciliation WHERE dispute_id = 'dp_open'), 'won',
  'won dispute transition updates reconciliation');

SELECT is(public.fulfill_stripe_event(jsonb_build_object('event_id','evt_dispute_lost','event_type','charge.dispute.closed',
  'event_created',1893456050,'kind','dispute','charge_id','ch_in_2','dispute_id','dp_lost','amount',239,'currency','usd','status','lost')),
  'processed', 'lost dispute is processed');
SELECT is((SELECT status FROM public.stripe_dispute_reconciliation WHERE dispute_id = 'dp_lost'), 'lost',
  'lost dispute revokes entitlement reconciliation');

SELECT is(public.fulfill_stripe_event(jsonb_build_object('event_id','evt_duplicate_refund','event_type','refund.updated',
  'event_created',1893456030,'kind','refund','charge_id','ch_in_3','refund_id','re_partial_1','amount',100,'currency','usd')),
  'processed', 'duplicate refund event remains harmless');
SELECT ok((SELECT count(*) FROM public.stripe_refund_reconciliation WHERE refund_id = 're_partial_1') = 1,
  'duplicate refund creates no second reconciliation row');
SELECT is(public.fulfill_stripe_event(pg_temp.payment_event('evt_cumulative_excess','in_4',1893456059,'2030-04-01T00:00:00Z',3)),
  'processed', 'independent cumulative-excess payment is fulfilled');
SELECT is(public.fulfill_stripe_event(jsonb_build_object(
  'event_id','evt_excess_refund_1','event_type','refund.updated','event_created',1893456060,
  'kind','refund','charge_id','ch_in_4','refund_id','re_excess_1','amount',150,'currency','usd')),
  'processed', 'first individually valid cumulative refund is processed');
SELECT is(public.fulfill_stripe_event(jsonb_build_object(
  'event_id','evt_excess_refund_2','event_type','refund.updated','event_created',1893456061,
  'kind','refund','charge_id','ch_in_4','refund_id','re_excess_2','amount',150,'currency','usd')),
  'processed', 'second individually valid cumulative refund is processed');
SELECT is((SELECT reconciliation_status FROM public.stripe_payment_records WHERE invoice_id = 'in_4'),
  'refund_dispute_overlap', 'excessive cumulative refund is flagged for reconciliation');

SELECT * FROM finish();
ROLLBACK;
