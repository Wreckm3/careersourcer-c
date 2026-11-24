BEGIN;

SELECT plan(46);

CREATE TEMP TABLE collaboration_test_users (
  slot integer PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE
);

INSERT INTO collaboration_test_users (slot, user_id)
SELECT slot, gen_random_uuid()
FROM generate_series(1, 40) AS slots(slot);

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
SELECT
  u.user_id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'collaboration-test-' || u.slot || '@example.test',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
FROM collaboration_test_users AS u;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 1),
  true
);

CREATE TEMP TABLE collaboration_test_team AS
SELECT public.create_team('Collaboration Phase 1 Test Team', false) AS team_id;

SELECT is(
  (SELECT count(*)::integer FROM public.team_members AS tm
   JOIN collaboration_test_team AS t ON t.team_id = tm.team_id
   WHERE tm.status = 'active'),
  1,
  'team creation atomically creates its active owner'
);

SELECT is(
  (SELECT count(*)::integer FROM public.team_members AS tm
   JOIN collaboration_test_team AS t ON t.team_id = tm.team_id
   WHERE tm.status = 'active' AND tm.role = 'owner'),
  1,
  'the owner counts as an active member'
);

INSERT INTO public.team_members (team_id, user_id, role, status)
SELECT t.team_id, u.user_id, 'member', 'active'
FROM collaboration_test_team AS t
CROSS JOIN collaboration_test_users AS u
WHERE u.slot BETWEEN 2 AND 24;

SELECT is(
  (SELECT count(*)::integer FROM public.team_members AS tm
   JOIN collaboration_test_team AS t ON t.team_id = tm.team_id
   WHERE tm.status = 'active'),
  24,
  'a team can have 24 active members including its owner'
);

CREATE TEMP TABLE collaboration_test_invitations (
  slot integer PRIMARY KEY,
  invitation_id uuid NOT NULL
);

INSERT INTO collaboration_test_invitations (slot, invitation_id)
SELECT u.slot, public.create_team_invitation(t.team_id, u.user_id)
FROM collaboration_test_team AS t
CROSS JOIN collaboration_test_users AS u
WHERE u.slot IN (25, 26);

SELECT is(
  (SELECT tier::text FROM public.subscriptions
   WHERE user_id = (SELECT user_id FROM collaboration_test_users WHERE slot = 25)),
  'free',
  'the final-slot invitation fixture is an authenticated free user'
);

SELECT is(
  (SELECT count(*)::integer FROM public.team_members AS tm
   JOIN collaboration_test_team AS t ON t.team_id = tm.team_id
   WHERE tm.status = 'active'),
  24,
  'pending invitations do not reserve membership slots'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 25),
  true
);
SELECT lives_ok(
  $$ SELECT public.accept_team_invitation(
       (SELECT invitation_id FROM collaboration_test_invitations WHERE slot = 25)
     ) $$,
  'a 24-member team accepts one more member'
);

SELECT is(
  (SELECT count(*)::integer FROM public.team_members AS tm
   JOIN collaboration_test_team AS t ON t.team_id = tm.team_id
   WHERE tm.status = 'active'),
  25,
  'accepted invitation produces exactly 25 active members'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 26),
  true
);
SELECT throws_ok(
  $$ SELECT public.accept_team_invitation(
       (SELECT invitation_id FROM collaboration_test_invitations WHERE slot = 26)
     ) $$,
  'P0001',
  'TEAM_FULL',
  'a 25-member team rejects another invitation acceptance'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 27),
  true
);
SELECT lives_ok(
  $$ SELECT public.request_to_join_team((SELECT team_id FROM collaboration_test_team)) $$,
  'a join request can be submitted while the team is full'
);
CREATE TEMP TABLE collaboration_test_request AS
SELECT id AS request_id
FROM public.team_join_requests
WHERE requester_id = (SELECT user_id FROM collaboration_test_users WHERE slot = 27);

SELECT is(
  (SELECT count(*)::integer FROM public.team_members AS tm
   JOIN collaboration_test_team AS t ON t.team_id = tm.team_id
   WHERE tm.status = 'active'),
  25,
  'pending join requests do not reserve membership slots'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 1),
  true
);
SELECT throws_ok(
  $$ SELECT public.approve_team_join_request(
       (SELECT request_id FROM collaboration_test_request)
     ) $$,
  'P0001',
  'TEAM_FULL',
  'a full team cannot approve a join request'
);
SELECT lives_ok(
  $$ SELECT public.decline_team_join_request(
       (SELECT request_id FROM collaboration_test_request)
     ) $$,
  'an owner can decline a pending request while the team is full'
);

SELECT lives_ok(
  $$ SELECT public.remove_team_member(
       (SELECT team_id FROM collaboration_test_team),
       (SELECT user_id FROM collaboration_test_users WHERE slot = 24)
     ) $$,
  'removing an active member frees a slot'
);
SELECT is(
  (SELECT count(*)::integer FROM public.team_members AS tm
   JOIN collaboration_test_team AS t ON t.team_id = tm.team_id
   WHERE tm.status = 'active'),
  24,
  'removal reduces the active membership count'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 26),
  true
);
SELECT lives_ok(
  $$ SELECT public.accept_team_invitation(
       (SELECT invitation_id FROM collaboration_test_invitations WHERE slot = 26)
     ) $$,
  'a pending invitation can be accepted after a member leaves'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 1),
  true
);
INSERT INTO collaboration_test_invitations (slot, invitation_id)
SELECT u.slot, public.create_team_invitation(t.team_id, u.user_id)
FROM collaboration_test_team AS t
CROSS JOIN collaboration_test_users AS u
WHERE u.slot BETWEEN 30 AND 37;
SELECT is(
  (SELECT count(*)::integer FROM public.team_invitations AS ti
   JOIN collaboration_test_team AS t ON t.team_id = ti.team_id
   WHERE ti.status = 'pending'),
  8,
  'pending invitations remain reviewable and do not consume membership slots'
);
SELECT throws_ok(
  $$ SELECT public.create_team_invitation(
       (SELECT team_id FROM collaboration_test_team),
       (SELECT user_id FROM collaboration_test_users WHERE slot = 38)
     ) $$,
  'P0001',
  'INVITATION_RATE_LIMIT',
  'an inviter cannot exceed ten invitations in 24 hours'
);

CREATE TEMP TABLE collaboration_test_rate_teams AS
SELECT
  slot,
  public.create_team('Join request rate test ' || slot, false) AS team_id
FROM generate_series(1, 20) AS slots(slot);
SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 27),
  true
);
SELECT lives_ok(
  $$ SELECT public.request_to_join_team(team_id)
     FROM collaboration_test_rate_teams WHERE slot <= 19 $$,
  'a requester may submit up to twenty requests in 24 hours'
);
SELECT throws_ok(
  $$ SELECT public.request_to_join_team(
       (SELECT team_id FROM collaboration_test_rate_teams WHERE slot = 20)
     ) $$,
  'P0001',
  'JOIN_REQUEST_RATE_LIMIT',
  'a requester cannot exceed twenty join requests in 24 hours'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 1),
  true
);
SELECT throws_ok(
  format(
    'INSERT INTO public.team_members (team_id, user_id, role, status) VALUES (%L, %L, %L, %L)',
    (SELECT team_id FROM collaboration_test_team),
    (SELECT user_id FROM collaboration_test_users WHERE slot = 29),
    'member',
    'active'
  ),
  'P0001',
  'TEAM_FULL',
  'the database trigger also rejects a privileged direct 26th insert'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 28),
  true
);
SELECT set_config(
  'test.collaboration_team_id',
  (SELECT team_id::text FROM collaboration_test_team),
  true
);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::integer FROM public.teams
   WHERE id = current_setting('test.collaboration_team_id')::uuid),
  0,
  'a non-member cannot read a private team'
);
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 39),
  true
);
CREATE TEMP TABLE collaboration_test_discoverable_team AS
SELECT public.create_team('Discoverable collaboration test team', true) AS team_id;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 28),
  true
);
SELECT set_config(
  'test.collaboration_discoverable_team_id',
  (SELECT team_id::text FROM collaboration_test_discoverable_team),
  true
);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::integer FROM public.teams
   WHERE id = current_setting('test.collaboration_discoverable_team_id')::uuid),
  1,
  'a non-member can read a discoverable team'
);
RESET ROLE;

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.team_members', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.team_members', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.team_members', 'DELETE'),
  'ordinary authenticated clients cannot directly write memberships'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.team_invitations', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.team_invitations', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.team_join_requests', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.team_join_requests', 'UPDATE'),
  'ordinary authenticated clients cannot bypass invitation or join-request RPCs'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 2),
  true
);
SELECT throws_ok(
  $$ SELECT public.transfer_team_ownership(
       (SELECT team_id FROM collaboration_test_team),
       (SELECT user_id FROM collaboration_test_users WHERE slot = 3)
     ) $$,
  '42501',
  'NOT_TEAM_OWNER',
  'a non-owner cannot transfer ownership'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 1),
  true
);
SELECT lives_ok(
  $$ SELECT public.transfer_team_ownership(
       (SELECT team_id FROM collaboration_test_team),
       (SELECT user_id FROM collaboration_test_users WHERE slot = 2)
     ) $$,
  'the owner can transfer ownership to an active member'
);
SELECT is(
  (SELECT count(*)::integer FROM public.team_members AS tm
   JOIN collaboration_test_team AS t ON t.team_id = tm.team_id
   WHERE tm.status = 'active' AND tm.role = 'owner'),
  1,
  'ownership transfer leaves exactly one active owner'
);
SELECT is(
  (SELECT tm.role::text FROM public.team_members AS tm
   JOIN collaboration_test_team AS t ON t.team_id = tm.team_id
   WHERE tm.user_id = (SELECT user_id FROM collaboration_test_users WHERE slot = 1)),
  'admin',
  'the previous owner becomes an admin after transfer'
);
SELECT throws_ok(
  $$ SELECT public.set_team_member_role(
       (SELECT team_id FROM collaboration_test_team),
       (SELECT user_id FROM collaboration_test_users WHERE slot = 3),
       'member'
     ) $$,
  '42501',
  'NOT_TEAM_OWNER',
  'an admin cannot change team roles'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 2),
  true
);
SELECT throws_ok(
  $$ SELECT public.leave_team((SELECT team_id FROM collaboration_test_team)) $$,
  'P0001',
  'OWNER_TRANSFER_REQUIRED',
  'the current owner cannot leave without another transfer'
);
SELECT throws_ok(
  $$ SELECT public.remove_team_member(
       (SELECT team_id FROM collaboration_test_team),
       (SELECT user_id FROM collaboration_test_users WHERE slot = 2)
     ) $$,
  'P0001',
  'OWNER_TRANSFER_REQUIRED',
  'the current owner cannot remove themselves'
);
SELECT lives_ok(
  $$ SELECT public.remove_team_member(
       (SELECT team_id FROM collaboration_test_team),
       (SELECT user_id FROM collaboration_test_users WHERE slot = 1)
     ) $$,
  'the current owner can remove the previous owner after transfer'
);
SELECT is(
  (SELECT count(*)::integer FROM public.team_members AS tm
   JOIN collaboration_test_team AS t ON t.team_id = tm.team_id
   WHERE tm.status = 'active' AND tm.role = 'owner'),
  1,
  'owner removal protection still leaves exactly one active owner'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 39),
  true
);
CREATE TEMP TABLE collaboration_test_expiry_team AS
SELECT public.create_team('Invitation expiry collaboration test team', false) AS team_id;
CREATE TEMP TABLE collaboration_test_expiring_invitation AS
SELECT public.create_team_invitation(
  (SELECT team_id FROM collaboration_test_expiry_team),
  (SELECT user_id FROM collaboration_test_users WHERE slot = 40)
) AS invitation_id;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 38),
  true
);
SELECT throws_ok(
  $$ SELECT public.accept_team_invitation(
       (SELECT invitation_id FROM collaboration_test_expiring_invitation)
     ) $$,
  'P0001',
  'INVITATION_NOT_AVAILABLE',
  'only the intended invitee can accept an invitation'
);

UPDATE public.team_invitations
SET
  created_at = now() - interval '2 days',
  expires_at = now() - interval '1 day'
WHERE id = (SELECT invitation_id FROM collaboration_test_expiring_invitation);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 40),
  true
);
SELECT is(
  public.accept_team_invitation(
    (SELECT invitation_id FROM collaboration_test_expiring_invitation)
  ),
  NULL::uuid,
  'an expired invitation cannot admit the invitee'
);
SELECT is(
  (SELECT status::text FROM public.team_invitations
   WHERE id = (SELECT invitation_id FROM collaboration_test_expiring_invitation)),
  'expired',
  'an expired invitation retains a terminal audit status'
);
SELECT ok(
  (SELECT responded_at IS NOT NULL FROM public.team_invitations
   WHERE id = (SELECT invitation_id FROM collaboration_test_expiring_invitation)),
  'an expired invitation retains its resolution timestamp'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 39),
  true
);
CREATE TEMP TABLE collaboration_test_invitation_cleanup_team AS
SELECT public.create_team('Invitation cleanup collaboration test team', false) AS team_id;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 40),
  true
);
CREATE TEMP TABLE collaboration_test_competing_request AS
SELECT public.request_to_join_team(
  (SELECT team_id FROM collaboration_test_invitation_cleanup_team)
) AS request_id;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 38),
  true
);
SELECT throws_ok(
  $$ SELECT public.approve_team_join_request(
       (SELECT request_id FROM collaboration_test_competing_request)
     ) $$,
  '42501',
  'NOT_TEAM_MANAGER',
  'a non-manager cannot approve a join request'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 37),
  true
);
SELECT throws_ok(
  $$ SELECT public.withdraw_team_join_request(
       (SELECT request_id FROM collaboration_test_competing_request)
     ) $$,
  'P0001',
  'JOIN_REQUEST_NOT_AVAILABLE',
  'a different user cannot withdraw a join request'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 39),
  true
);
CREATE TEMP TABLE collaboration_test_competing_invitation AS
SELECT public.create_team_invitation(
  (SELECT team_id FROM collaboration_test_invitation_cleanup_team),
  (SELECT user_id FROM collaboration_test_users WHERE slot = 40)
) AS invitation_id;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 40),
  true
);
SELECT lives_ok(
  $$ SELECT public.accept_team_invitation(
       (SELECT invitation_id FROM collaboration_test_competing_invitation)
     ) $$,
  'accepting an invitation admits its invitee'
);
SELECT is(
  (SELECT status::text FROM public.team_join_requests
   WHERE id = (SELECT request_id FROM collaboration_test_competing_request)),
  'withdrawn',
  'accepting an invitation withdraws the competing pending join request'
);
SELECT ok(
  (SELECT responded_at IS NOT NULL FROM public.team_join_requests
   WHERE id = (SELECT request_id FROM collaboration_test_competing_request)),
  'the withdrawn competing join request keeps a resolution timestamp'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 39),
  true
);
CREATE TEMP TABLE collaboration_test_request_cleanup_team AS
SELECT public.create_team('Join request cleanup collaboration test team', false) AS team_id;
CREATE TEMP TABLE collaboration_test_competing_invitation_two AS
SELECT public.create_team_invitation(
  (SELECT team_id FROM collaboration_test_request_cleanup_team),
  (SELECT user_id FROM collaboration_test_users WHERE slot = 40)
) AS invitation_id;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 40),
  true
);
CREATE TEMP TABLE collaboration_test_competing_request_two AS
SELECT public.request_to_join_team(
  (SELECT team_id FROM collaboration_test_request_cleanup_team)
) AS request_id;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM collaboration_test_users WHERE slot = 39),
  true
);
SELECT lives_ok(
  $$ SELECT public.approve_team_join_request(
       (SELECT request_id FROM collaboration_test_competing_request_two)
     ) $$,
  'approving a join request admits its requester'
);
SELECT is(
  (SELECT status::text FROM public.team_invitations
   WHERE id = (SELECT invitation_id FROM collaboration_test_competing_invitation_two)),
  'revoked',
  'approving a join request revokes the competing pending invitation'
);
SELECT ok(
  (SELECT responded_at IS NOT NULL FROM public.team_invitations
   WHERE id = (SELECT invitation_id FROM collaboration_test_competing_invitation_two)),
  'the revoked competing invitation keeps a resolution timestamp'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.team_rate_limit_guards', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.team_rate_limit_guards', 'INSERT')
  AND NOT has_function_privilege(
    'authenticated',
    'public.lock_team_rate_limit(uuid,text)',
    'EXECUTE'
  ),
  'rate-limit guard storage and helper remain private'
);

SELECT * FROM finish();
ROLLBACK;
