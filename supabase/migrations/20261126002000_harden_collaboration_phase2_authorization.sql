-- Resolve email-only invitations against the account's current confirmed email.
CREATE FUNCTION public.current_verified_team_invitation_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT lower(u.email)
  FROM auth.users AS u
  WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.current_verified_team_invitation_email() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_verified_team_invitation_email() TO authenticated;

DROP POLICY team_invitations_read ON public.team_invitations;
CREATE POLICY team_invitations_read
  ON public.team_invitations FOR SELECT TO authenticated
  USING (
    invitee_id = auth.uid()
    OR (invitee_id IS NULL AND invitee_email = public.current_verified_team_invitation_email())
    OR public.is_team_manager(team_id)
  );

CREATE OR REPLACE FUNCTION public.has_pending_team_invitation(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.team_invitations AS invitation
    WHERE invitation.team_id = _team_id
      AND invitation.status = 'pending'
      AND invitation.expires_at > now()
      AND (
        invitation.invitee_id = auth.uid()
        OR (
          invitation.invitee_id IS NULL
          AND invitation.invitee_email = public.current_verified_team_invitation_email()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.create_team_invitation_by_email(
  _team_id uuid,
  _invitee_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text := lower(btrim(_invitee_email));
  v_invitee_id uuid;
  v_invitation_id uuid;
  v_pending_count integer;
  v_daily_count integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  IF v_email IS NULL OR char_length(v_email) NOT BETWEEN 3 AND 254
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INVITEE_EMAIL';
  END IF;
  PERFORM public.lock_team_rate_limit(v_actor, 'invitation');
  PERFORM team.id FROM public.teams AS team WHERE team.id = _team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  IF NOT public.is_team_manager(_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_TEAM_MANAGER';
  END IF;

  SELECT user_row.id INTO v_invitee_id
  FROM auth.users AS user_row
  WHERE lower(user_row.email) = v_email AND user_row.email_confirmed_at IS NOT NULL;
  IF v_invitee_id = v_actor THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INVITEE';
  END IF;
  IF v_invitee_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members AS member
    WHERE member.team_id = _team_id
      AND member.user_id = v_invitee_id
      AND member.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ALREADY_TEAM_MEMBER';
  END IF;

  UPDATE public.teams
  SET collaboration_version = collaboration_version + 1
  WHERE id = _team_id;
  UPDATE public.team_invitations AS invitation
  SET status = 'expired', responded_at = now()
  WHERE invitation.team_id = _team_id
    AND invitation.status = 'pending'
    AND invitation.expires_at <= now();

  SELECT invitation.id INTO v_invitation_id
  FROM public.team_invitations AS invitation
  WHERE invitation.team_id = _team_id
    AND invitation.status = 'pending'
    AND invitation.expires_at > now()
    AND (
      (v_invitee_id IS NOT NULL AND invitation.invitee_id = v_invitee_id)
      OR lower(invitation.invitee_email) = v_email
    )
  LIMIT 1;
  IF FOUND THEN
    RETURN v_invitation_id;
  END IF;

  SELECT count(*)::integer INTO v_pending_count
  FROM public.team_invitations AS invitation
  WHERE invitation.team_id = _team_id
    AND invitation.status = 'pending'
    AND invitation.expires_at > now();
  IF v_pending_count >= 50 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_INVITATION_LIMIT';
  END IF;
  SELECT count(*)::integer INTO v_daily_count
  FROM public.team_invitations AS invitation
  WHERE invitation.invited_by = v_actor
    AND invitation.created_at >= now() - interval '24 hours';
  IF v_daily_count >= 10 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_RATE_LIMIT';
  END IF;

  INSERT INTO public.team_invitations
    (team_id, invited_by, invitee_id, invitee_email)
  VALUES (_team_id, v_actor, v_invitee_id, v_email)
  RETURNING id INTO v_invitation_id;
  RETURN v_invitation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_team_invitation(_invitation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text := public.current_verified_team_invitation_email();
  v_team_id uuid;
  v_invitation public.team_invitations%ROWTYPE;
  v_member_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  SELECT invitation.team_id INTO v_team_id
  FROM public.team_invitations AS invitation
  WHERE invitation.id = _invitation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_NOT_FOUND';
  END IF;
  PERFORM team.id FROM public.teams AS team WHERE team.id = v_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  SELECT invitation.* INTO v_invitation
  FROM public.team_invitations AS invitation
  WHERE invitation.id = _invitation_id
  FOR UPDATE;
  IF NOT FOUND
     OR v_invitation.status <> 'pending'
     OR NOT (
       v_invitation.invitee_id IS NOT DISTINCT FROM v_user_id
       OR (
         v_invitation.invitee_id IS NULL
         AND v_user_email IS NOT NULL
         AND v_invitation.invitee_email IS NOT DISTINCT FROM v_user_email
       )
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_NOT_AVAILABLE';
  END IF;
  IF v_invitation.expires_at <= now() THEN
    UPDATE public.team_invitations
    SET status = 'expired', responded_at = now()
    WHERE id = _invitation_id;
    RETURN NULL;
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role, status, joined_at)
  VALUES (v_team_id, v_user_id, 'member', 'active', now())
  ON CONFLICT (team_id, user_id) DO UPDATE
    SET role = 'member', status = 'active', joined_at = now()
    WHERE public.team_members.status <> 'active'
  RETURNING user_id INTO v_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ALREADY_TEAM_MEMBER';
  END IF;

  UPDATE public.team_invitations
  SET status = 'accepted', invitee_id = v_user_id, responded_at = now()
  WHERE id = _invitation_id;
  UPDATE public.team_invitations
  SET status = CASE
        WHEN expires_at <= now() THEN 'expired'::public.team_invitation_status
        ELSE 'revoked'::public.team_invitation_status
      END,
      responded_at = now()
  WHERE team_id = v_team_id AND status = 'pending'
    AND (invitee_id = v_user_id OR (invitee_id IS NULL AND invitee_email = v_user_email));
  UPDATE public.team_join_requests
  SET status = CASE
        WHEN expires_at <= now() THEN 'expired'::public.team_join_request_status
        ELSE 'withdrawn'::public.team_join_request_status
      END,
      responded_at = now()
  WHERE team_id = v_team_id
    AND requester_id = v_user_id
    AND status = 'pending';
  RETURN v_team_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_team_invitation(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text := public.current_verified_team_invitation_email();
  v_team_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  SELECT invitation.team_id INTO v_team_id
  FROM public.team_invitations AS invitation
  WHERE invitation.id = _invitation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_NOT_FOUND';
  END IF;
  PERFORM team.id FROM public.teams AS team WHERE team.id = v_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  UPDATE public.team_invitations
  SET status = 'declined', responded_at = now()
  WHERE id = _invitation_id
    AND status = 'pending'
    AND (
      invitee_id = v_user_id
      OR (invitee_id IS NULL AND invitee_email = v_user_email)
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_NOT_AVAILABLE';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_team_project_task_status(
  _task_id uuid,
  _status public.team_project_task_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_project_id uuid;
  v_assignee_id uuid;
BEGIN
  SELECT task.team_id, task.project_id, task.assignee_id
  INTO v_team_id, v_project_id, v_assignee_id
  FROM public.team_project_tasks AS task
  WHERE task.id = _task_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TASK_NOT_FOUND';
  END IF;
  IF v_user_id IS NULL OR NOT public.is_active_team_member(v_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_ACTIVE_TEAM_MEMBER';
  END IF;
  IF v_user_id IS DISTINCT FROM v_assignee_id AND NOT public.can_manage_team_project(v_project_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_TASK_ASSIGNEE_OR_MANAGER';
  END IF;
  UPDATE public.team_project_tasks
  SET status = _status,
      completed_at = CASE WHEN _status = 'completed' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = _task_id;
  PERFORM public.write_team_project_activity(
    v_team_id, v_project_id, 'task_updated', _task_id,
    jsonb_build_object('status', _status)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_team_join_request(_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_team_id uuid;
  v_request public.team_join_requests%ROWTYPE;
  v_member_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  SELECT tjr.team_id INTO v_team_id
  FROM public.team_join_requests AS tjr WHERE tjr.id = _request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'JOIN_REQUEST_NOT_FOUND';
  END IF;
  PERFORM t.id FROM public.teams AS t WHERE t.id = v_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  IF NOT public.is_team_manager(v_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_TEAM_MANAGER';
  END IF;

  SELECT tjr.* INTO v_request
  FROM public.team_join_requests AS tjr
  WHERE tjr.id = _request_id
  FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'JOIN_REQUEST_NOT_PENDING';
  END IF;
  IF v_request.expires_at <= now() THEN
    UPDATE public.team_join_requests
    SET status = 'expired', responded_at = now()
    WHERE id = _request_id;
    RETURN NULL;
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role, status, joined_at)
  VALUES (v_team_id, v_request.requester_id, 'member', 'active', now())
  ON CONFLICT (team_id, user_id) DO UPDATE
    SET role = 'member', status = 'active', joined_at = now()
    WHERE public.team_members.status <> 'active'
  RETURNING user_id INTO v_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ALREADY_TEAM_MEMBER';
  END IF;

  UPDATE public.team_join_requests
  SET status = 'approved', responded_at = now()
  WHERE id = _request_id;

  UPDATE public.team_invitations
  SET
    status = CASE
      WHEN expires_at <= now() THEN 'expired'::public.team_invitation_status
      ELSE 'revoked'::public.team_invitation_status
    END,
    responded_at = now()
  WHERE team_id = v_team_id
    AND status = 'pending'
    AND (
      invitee_id = v_request.requester_id
      OR (invitee_id IS NULL AND invitee_email = (
        SELECT lower(u.email) FROM auth.users AS u
        WHERE u.id = v_request.requester_id AND u.email_confirmed_at IS NOT NULL
      ))
    );
  RETURN v_team_id;
END;
$$;
