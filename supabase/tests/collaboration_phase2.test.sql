BEGIN;
SELECT plan(42);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ('e2000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'phase2-owner@example.test', '', now(), '{}', '{}', now(), now()),
  ('e2000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'phase2-member@example.test', '', now(), '{}', '{}', now(), now()),
  ('e2000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'phase2-outsider@example.test', '', now(), '{}', '{}', now(), now());

SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000001', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000001","email":"phase2-owner@example.test"}',
  true
);
CREATE TEMP TABLE phase2_team AS
SELECT public.create_team('Collaboration Phase 2 test team', true) AS id;
INSERT INTO public.team_members (team_id, user_id, role, status)
SELECT id, 'e2000000-0000-4000-8000-000000000002', 'member', 'active'
FROM phase2_team;
CREATE TEMP TABLE phase2_project AS
SELECT public.create_team_project(
  (SELECT id FROM phase2_team),
  'Shared project',
  'Private project description',
  'Ship a small, tested milestone'
) AS id;
SELECT set_config('test.phase2_team_id', (SELECT id::text FROM phase2_team), true);
SELECT set_config('test.phase2_project_id', (SELECT id::text FROM phase2_project), true);

SELECT is(
  (SELECT count(*)::integer FROM public.team_members
   WHERE team_id = (SELECT id FROM phase2_team) AND status = 'active' AND role = 'owner'),
  1,
  'team creation keeps exactly one active owner'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.team_projects', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.team_projects', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.team_project_tasks', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.team_project_messages', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.team_project_contributions', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.team_project_activity', 'SELECT'),
  'clients cannot bypass transactional project operations or read private history anonymously'
);

CREATE TEMP TABLE phase2_task AS
SELECT public.create_team_project_task(
  (SELECT id FROM phase2_project),
  'Build the accessible landing page',
  'Add keyboard navigation and a clear mobile layout',
  'e2000000-0000-4000-8000-000000000002',
  NULL,
  'normal'
) AS id;
SELECT set_config('test.phase2_task_id', (SELECT id::text FROM phase2_task), true);
SELECT is(
  (SELECT assignee_id FROM public.team_project_tasks WHERE id = (SELECT id FROM phase2_task)),
  'e2000000-0000-4000-8000-000000000002'::uuid,
  'a manager can assign a task to an active team member'
);
SELECT throws_ok(
  $$ SELECT public.create_team_project_task(
       current_setting('test.phase2_project_id')::uuid,
       'Invalid assignment',
       '',
       'e2000000-0000-4000-8000-000000000003',
       NULL,
       'normal'
     ) $$,
  'P0001',
  'ASSIGNEE_NOT_ACTIVE_TEAM_MEMBER',
  'a task cannot be assigned outside the team'
);

SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000002","email":"phase2-member@example.test"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::integer FROM public.team_projects
   WHERE id = current_setting('test.phase2_project_id')::uuid),
  1,
  'an active team member can read its project'
);
SELECT lives_ok(
  $$ SELECT public.set_team_project_task_status(
       current_setting('test.phase2_task_id')::uuid,
       'in_progress'
     ) $$,
  'an assigned member can update their task progress'
);
SELECT throws_ok(
  $$ SELECT public.update_team_project(
       current_setting('test.phase2_project_id')::uuid,
       'Hijacked project',
       '',
       '',
       'archived'
     ) $$,
  '42501',
  'NOT_PROJECT_MANAGER',
  'an ordinary member cannot change project management fields'
);
SELECT throws_ok(
  $$ SELECT public.create_team_project_task(
       current_setting('test.phase2_project_id')::uuid,
       'Assign another person',
       '',
       'e2000000-0000-4000-8000-000000000003',
       NULL,
       'normal'
     ) $$,
  '42501',
  'ONLY_MANAGERS_CAN_ASSIGN_OTHERS',
  'a member cannot assign work to a different person'
);
SELECT throws_ok(
  $$ SELECT public.submit_team_project_contribution(
       current_setting('test.phase2_task_id')::uuid,
       'Completed the assigned task',
       'I tested keyboard navigation.',
       'forged-objective'
     ) $$,
  'P0001',
  'STUDYFLOW_OBJECTIVE_NOT_FOUND',
  'contribution links must reference an active personal StudyFlow objective'
);
RESET ROLE;

INSERT INTO public.user_progress (user_id, selected_path)
VALUES ('e2000000-0000-4000-8000-000000000002', 'web-development')
ON CONFLICT (user_id) DO UPDATE SET selected_path = EXCLUDED.selected_path;
INSERT INTO public.atlas_studyflows
  (user_id, branch_id, status, revision, active_roadmap)
VALUES (
  'e2000000-0000-4000-8000-000000000002',
  'web-development',
  'active',
  1,
  '{"objectives":[{"id":"goal","stages":[{"id":"stage","lessons":[{"id":"lesson-one"}]}]}]}'::jsonb
);

SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE phase2_contribution AS
SELECT public.submit_team_project_contribution(
  current_setting('test.phase2_task_id')::uuid,
  'Built the responsive page and added focus-state tests',
  'Source and test evidence: https://example.test/phase2-proof',
  'lesson-one'
) AS id;
SELECT set_config('test.phase2_contribution_id', (SELECT id::text FROM phase2_contribution), true);
SELECT throws_ok(
  $$ SELECT public.review_team_project_contribution(
       current_setting('test.phase2_contribution_id')::uuid,
       true,
       'Looks good'
     ) $$,
  '42501',
  'SELF_REVIEW_FORBIDDEN',
  'a contributor cannot review their own contribution'
);
SELECT throws_ok(
  $$ SELECT public.set_team_contribution_portfolio_consent(
       current_setting('test.phase2_contribution_id')::uuid,
       true
     ) $$,
  'P0001',
  'CONTRIBUTION_NOT_APPROVED',
  'portfolio consent cannot publish an unreviewed claim'
);
SELECT ok(
  public.is_team_attachment_path(
    current_setting('test.phase2_team_id') || '/' ||
    current_setting('test.phase2_project_id') || '/' ||
    auth.uid()::text || '/10000000-0000-4000-8000-000000000009_proof.pdf'
  ),
  'an active member can resolve a valid attachment path for their team project'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000003', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000003","email":"phase2-outsider@example.test"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::integer FROM public.team_projects
   WHERE id = current_setting('test.phase2_project_id')::uuid),
  0,
  'a non-member cannot read another team project'
);
SELECT is(
  (SELECT count(*)::integer FROM public.team_project_messages
   WHERE project_id = current_setting('test.phase2_project_id')::uuid),
  0,
  'a non-member cannot read private team discussions'
);
SELECT ok(
  NOT public.is_team_attachment_path(
    current_setting('test.phase2_team_id') || '/' ||
    current_setting('test.phase2_project_id') || '/' ||
    auth.uid()::text || '/10000000-0000-4000-8000-000000000009_proof.pdf'
  ),
  'a non-member cannot resolve private team attachment paths'
);
SELECT throws_ok(
  $$ SELECT public.review_team_project_contribution(
       current_setting('test.phase2_contribution_id')::uuid,
       true,
       'Unauthorized'
     ) $$,
  '42501',
  'NOT_TEAM_REVIEWER',
  'a non-manager cannot verify a contribution'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000001', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$ SELECT public.review_team_project_contribution(
       current_setting('test.phase2_contribution_id')::uuid,
       true,
       'The submitted implementation and tests meet the task criteria.'
     ) $$,
  'an authorized manager can approve another member contribution'
);
SELECT is(
  (SELECT status::text FROM public.team_project_contributions
   WHERE id = current_setting('test.phase2_contribution_id')::uuid),
  'approved',
  'approved contributions retain their verified state'
);
SELECT lives_ok(
  $$ SELECT public.create_team_project_milestone(
       current_setting('test.phase2_project_id')::uuid,
       'Accessible beta',
       'Ship the tested first release',
       now() + interval '14 days'
     ) $$,
  'a project manager can create a dated milestone'
);
SELECT is(
  (SELECT count(*)::integer FROM public.team_project_activity
   WHERE project_id = current_setting('test.phase2_project_id')::uuid),
  6,
  'project, task, task progress, contribution, review and milestone actions are auditable'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$ SELECT public.set_team_contribution_portfolio_consent(
       current_setting('test.phase2_contribution_id')::uuid,
       true
     ) $$,
  'the contributor can consent to an approved item appearing in their portfolio'
);
SELECT is(
  (SELECT count(*)::integer FROM public.team_contribution_portfolio
   WHERE contribution_id = current_setting('test.phase2_contribution_id')::uuid
     AND user_id = auth.uid()),
  1,
  'portfolio publication stores an individual evidence snapshot under contributor ownership'
);
SELECT lives_ok(
  $$ SELECT public.set_team_contribution_portfolio_consent(
       current_setting('test.phase2_contribution_id')::uuid,
       false
     ) $$,
  'the contributor can revoke portfolio consent'
);
SELECT is(
  (SELECT count(*)::integer FROM public.team_contribution_portfolio
   WHERE contribution_id = current_setting('test.phase2_contribution_id')::uuid),
  0,
  'revoking consent removes the personal portfolio copy'
);
SELECT lives_ok(
  $$ SELECT public.send_team_project_message(
       current_setting('test.phase2_project_id')::uuid,
       'First saved message'
     ) $$,
  'an active team member can send a persistent project message'
);
SELECT lives_ok(
  $$ SELECT public.send_team_project_message(
       current_setting('test.phase2_project_id')::uuid,
       'Rate-window message ' || message_number
     )
     FROM generate_series(1, 19) AS message_number $$,
  'the member can send up to twenty messages in one minute'
);
SELECT throws_ok(
  $$ SELECT public.send_team_project_message(
       current_setting('test.phase2_project_id')::uuid,
       'Message over the rate limit'
     ) $$,
  'P0001',
  'MESSAGE_RATE_LIMIT',
  'message rate limits reject the next send in the window'
);
SELECT is(
  (SELECT count(*)::integer FROM public.team_project_messages
   WHERE project_id = current_setting('test.phase2_project_id')::uuid
     AND author_id = auth.uid()),
  20,
  'all permitted discussion messages remain persisted'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000001', true);
CREATE TEMP TABLE phase2_unassigned_task AS
SELECT public.create_team_project_task(
  current_setting('test.phase2_project_id')::uuid,
  'Open task for claiming',
  '',
  NULL,
  NULL,
  'low'
) AS id;
SELECT set_config('test.phase2_unassigned_task_id', (SELECT id::text FROM phase2_unassigned_task), true);
SELECT lives_ok(
  $$ SELECT public.create_team_invitation_by_email(
       current_setting('test.phase2_team_id')::uuid,
       'future-collaborator@example.test'
     ) $$,
  'a manager can invite an address before that person registers'
);
CREATE TEMP TABLE phase2_email_invitation AS
SELECT id FROM public.team_invitations
WHERE team_id = current_setting('test.phase2_team_id')::uuid
  AND invitee_email = 'future-collaborator@example.test'
  AND status = 'pending';
SELECT is(
  (SELECT invitee_id FROM phase2_email_invitation),
  NULL::uuid,
  'email invitations do not require exposing or fabricating an account ID'
);
SELECT lives_ok(
  $$ SELECT public.create_team_invitation_by_email(
       current_setting('test.phase2_team_id')::uuid,
       'decline-collaborator@example.test'
     ) $$,
  'a second pending email invitation can be created'
);
CREATE TEMP TABLE phase2_decline_invitation AS
SELECT id FROM public.team_invitations
WHERE team_id = current_setting('test.phase2_team_id')::uuid
  AND invitee_email = 'decline-collaborator@example.test'
  AND status = 'pending';
RESET ROLE;

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ('e2000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'future-collaborator@example.test', '', now(), '{}', '{}', now(), now());
SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000004', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000004","email":"future-collaborator@example.test"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::integer FROM public.teams
   WHERE id = current_setting('test.phase2_team_id')::uuid),
  1,
  'the invited email can discover its pending team invitation'
);
SELECT lives_ok(
  $$ SELECT public.accept_team_invitation((SELECT id FROM phase2_email_invitation)) $$,
  'the verified email owner can accept an invitation created before registration'
);
SELECT is(
  (SELECT count(*)::integer FROM public.team_members
   WHERE team_id = current_setting('test.phase2_team_id')::uuid
     AND user_id = auth.uid() AND status = 'active'),
  1,
  'acceptance binds the pending email invitation to the authenticated user'
);
SELECT lives_ok(
  $$ SELECT public.decline_team_invitation((SELECT id FROM phase2_decline_invitation)) $$,
  'the verified email owner can decline a pending invitation'
);
SELECT lives_ok(
  $$ SELECT public.claim_team_project_task(
       current_setting('test.phase2_unassigned_task_id')::uuid
     ) $$,
  'a member can claim an unassigned, incomplete task'
);
SELECT is(
  (SELECT assignee_id FROM public.team_project_tasks
   WHERE id = current_setting('test.phase2_unassigned_task_id')::uuid),
  auth.uid(),
  'a successful claim is assigned to the caller'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000001', true);
SELECT lives_ok(
  $$ SELECT public.remove_team_member(
       current_setting('test.phase2_team_id')::uuid,
       'e2000000-0000-4000-8000-000000000002'
     ) $$,
  'a team manager can remove an active member'
);
SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::integer FROM public.team_projects
   WHERE id = current_setting('test.phase2_project_id')::uuid),
  0,
  'removal immediately revokes project reads'
);
SELECT is(
  (SELECT count(*)::integer FROM public.team_project_messages
   WHERE project_id = current_setting('test.phase2_project_id')::uuid),
  0,
  'removal immediately revokes private discussion reads'
);
SELECT lives_ok(
  $$ SELECT public.set_team_contribution_portfolio_consent(
       current_setting('test.phase2_contribution_id')::uuid,
       true
     ) $$,
  'a former member can manage their own approved portfolio evidence'
);
SELECT is(
  (SELECT count(*)::integer FROM public.team_contribution_portfolio
   WHERE contribution_id = current_setting('test.phase2_contribution_id')::uuid
     AND user_id = auth.uid()),
  1,
  'portfolio evidence remains private to its contributor after departure'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
