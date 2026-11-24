-- Collaboration Phase 1: private teams, controlled membership, invitations,
-- and join requests. This migration is local-first; do not apply to a hosted
-- project as part of this implementation task.

CREATE TYPE public.team_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.team_membership_status AS ENUM ('active', 'left', 'removed');
CREATE TYPE public.team_invitation_status AS ENUM (
  'pending', 'accepted', 'declined', 'revoked', 'expired'
);
CREATE TYPE public.team_join_request_status AS ENUM (
  'pending', 'approved', 'declined', 'withdrawn', 'expired'
);

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_discoverable boolean NOT NULL DEFAULT false,
  collaboration_version bigint NOT NULL DEFAULT 0 CHECK (collaboration_version >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.team_member_role NOT NULL,
  status public.team_membership_status NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE UNIQUE INDEX team_members_one_active_owner_idx
  ON public.team_members (team_id)
  WHERE role = 'owner' AND status = 'active';
CREATE INDEX team_members_user_status_idx
  ON public.team_members (user_id, status);

CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.team_invitation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  responded_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK (invited_by <> invitee_id)
);
CREATE UNIQUE INDEX team_invitations_one_pending_idx
  ON public.team_invitations (team_id, invitee_id)
  WHERE status = 'pending';
CREATE INDEX team_invitations_invitee_idx
  ON public.team_invitations (invitee_id, status, created_at DESC);
CREATE INDEX team_invitations_team_pending_idx
  ON public.team_invitations (team_id, created_at)
  WHERE status = 'pending';

CREATE TABLE public.team_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.team_join_request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  responded_at timestamptz,
  CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX team_join_requests_one_pending_idx
  ON public.team_join_requests (team_id, requester_id)
  WHERE status = 'pending';
CREATE INDEX team_join_requests_requester_idx
  ON public.team_join_requests (requester_id, status, created_at DESC);
CREATE INDEX team_join_requests_team_pending_idx
  ON public.team_join_requests (team_id, created_at)
  WHERE status = 'pending';

-- A private per-actor guard makes rate-limit checks serializable without
-- imposing a global collaboration lock. The operation dimension keeps
-- invitation and join-request traffic independent.
CREATE TABLE public.team_rate_limit_guards (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('invitation', 'join_request')),
  touched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, operation)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_rate_limit_guards ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.teams,
  public.team_members,
  public.team_invitations,
  public.team_join_requests,
  public.team_rate_limit_guards
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.teams,
  public.team_members,
  public.team_invitations,
  public.team_join_requests
TO authenticated;

GRANT ALL ON TABLE
  public.teams,
  public.team_members,
  public.team_invitations,
  public.team_join_requests,
  public.team_rate_limit_guards
TO service_role;

-- These narrowly scoped helpers run as the table owner, so RLS policies can
-- inspect membership without recursively querying their own protected tables.
CREATE FUNCTION public.is_active_team_member(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.team_members AS tm
    WHERE tm.team_id = _team_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  );
$$;

CREATE FUNCTION public.is_team_manager(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.team_members AS tm
    WHERE tm.team_id = _team_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  );
$$;

CREATE FUNCTION public.has_pending_team_invitation(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.team_invitations AS ti
    WHERE ti.team_id = _team_id
      AND ti.invitee_id = auth.uid()
      AND ti.status = 'pending'
      AND ti.expires_at > now()
  );
$$;

CREATE FUNCTION public.has_pending_team_join_request(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.team_join_requests AS tjr
    WHERE tjr.team_id = _team_id
      AND tjr.requester_id = auth.uid()
      AND tjr.status = 'pending'
      AND tjr.expires_at > now()
  );
$$;

CREATE FUNCTION public.lock_team_rate_limit(_user_id uuid, _operation text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF _operation IS NULL OR _operation NOT IN ('invitation', 'join_request') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_RATE_LIMIT_OPERATION';
  END IF;

  INSERT INTO public.team_rate_limit_guards AS guard_row (user_id, operation, touched_at)
  VALUES (_user_id, _operation, now())
  ON CONFLICT (user_id, operation) DO UPDATE
    SET touched_at = EXCLUDED.touched_at;
END;
$$;

REVOKE ALL ON FUNCTION public.is_active_team_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_team_manager(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_pending_team_invitation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_pending_team_join_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lock_team_rate_limit(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_pending_team_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_pending_team_join_request(uuid) TO authenticated;

CREATE POLICY teams_read
  ON public.teams FOR SELECT TO authenticated
  USING (
    public.is_active_team_member(id)
    OR is_discoverable
    OR public.has_pending_team_invitation(id)
    OR public.has_pending_team_join_request(id)
  );

CREATE POLICY team_members_read
  ON public.team_members FOR SELECT TO authenticated
  USING (public.is_active_team_member(team_id));

CREATE POLICY team_invitations_read
  ON public.team_invitations FOR SELECT TO authenticated
  USING (invitee_id = auth.uid() OR public.is_team_manager(team_id));

CREATE POLICY team_join_requests_read
  ON public.team_join_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.is_team_manager(team_id));

-- Serialize membership mutations on the parent row. Updating the version as
-- well as locking the row makes a waiting REPEATABLE READ transaction abort
-- rather than check capacity against a stale snapshot.
CREATE FUNCTION public.guard_team_membership_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_team_id uuid;
  v_active_count integer;
  v_needs_slot boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.team_id IS DISTINCT FROM OLD.team_id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'MEMBERSHIP_IDENTITY_IMMUTABLE';
  END IF;

  v_team_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.team_id ELSE NEW.team_id END;

  PERFORM t.id
  FROM public.teams AS t
  WHERE t.id = v_team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;

  UPDATE public.teams
  SET collaboration_version = collaboration_version + 1
  WHERE id = v_team_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_needs_slot := NEW.status = 'active';
  ELSE
    v_needs_slot := NEW.status = 'active' AND OLD.status <> 'active';
  END IF;

  IF v_needs_slot THEN
    SELECT count(*)::integer
    INTO v_active_count
    FROM public.team_members AS tm
    WHERE tm.team_id = v_team_id
      AND tm.status = 'active';

    IF v_active_count >= 25 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_FULL';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER team_members_guard_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_team_membership_write();

CREATE FUNCTION public.assert_team_membership_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_team_id uuid;
  v_active_count integer;
  v_owner_count integer;
BEGIN
  IF TG_TABLE_NAME = 'teams' THEN
    v_team_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  ELSE
    v_team_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.team_id ELSE NEW.team_id END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.teams AS t WHERE t.id = v_team_id) THEN
    RETURN NULL;
  END IF;

  SELECT
    count(*) FILTER (WHERE tm.status = 'active')::integer,
    count(*) FILTER (
      WHERE tm.status = 'active' AND tm.role = 'owner'
    )::integer
  INTO v_active_count, v_owner_count
  FROM public.team_members AS tm
  WHERE tm.team_id = v_team_id;

  IF v_active_count < 1 OR v_active_count > 25 OR v_owner_count <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TEAM_MEMBERSHIP_INVARIANT',
      DETAIL = format(
        'team_id=%s active_members=%s active_owners=%s',
        v_team_id, v_active_count, v_owner_count
      );
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER teams_membership_invariant
  AFTER INSERT OR UPDATE ON public.teams
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.assert_team_membership_invariants();

CREATE CONSTRAINT TRIGGER team_members_membership_invariant
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.assert_team_membership_invariants();

REVOKE ALL ON FUNCTION public.guard_team_membership_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_team_membership_invariants() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.create_team(_name text, _is_discoverable boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_name text := btrim(_name);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  IF v_name IS NULL OR char_length(v_name) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_TEAM_NAME';
  END IF;

  INSERT INTO public.teams (name, created_by, is_discoverable)
  VALUES (v_name, v_user_id, coalesce(_is_discoverable, false))
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members (team_id, user_id, role, status)
  VALUES (v_team_id, v_user_id, 'owner', 'active');

  RETURN v_team_id;
END;
$$;

CREATE FUNCTION public.create_team_invitation(_team_id uuid, _invitee_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_invitation_id uuid;
  v_pending_count integer;
  v_daily_count integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  IF _invitee_id IS NULL OR _invitee_id = v_actor THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INVITEE';
  END IF;

  PERFORM public.lock_team_rate_limit(v_actor, 'invitation');

  PERFORM t.id FROM public.teams AS t WHERE t.id = _team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  IF NOT public.is_team_manager(_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_TEAM_MANAGER';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = _invitee_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITEE_NOT_FOUND';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = _team_id AND tm.user_id = _invitee_id AND tm.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ALREADY_TEAM_MEMBER';
  END IF;

  UPDATE public.teams
  SET collaboration_version = collaboration_version + 1
  WHERE id = _team_id;

  UPDATE public.team_invitations AS ti
  SET status = 'expired', responded_at = now()
  WHERE ti.team_id = _team_id
    AND ti.status = 'pending'
    AND ti.expires_at <= now();

  SELECT ti.id INTO v_invitation_id
  FROM public.team_invitations AS ti
  WHERE ti.team_id = _team_id
    AND ti.invitee_id = _invitee_id
    AND ti.status = 'pending'
    AND ti.expires_at > now();
  IF FOUND THEN
    RETURN v_invitation_id;
  END IF;

  SELECT count(*)::integer INTO v_pending_count
  FROM public.team_invitations AS ti
  WHERE ti.team_id = _team_id AND ti.status = 'pending' AND ti.expires_at > now();
  IF v_pending_count >= 50 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_INVITATION_LIMIT';
  END IF;

  SELECT count(*)::integer INTO v_daily_count
  FROM public.team_invitations AS ti
  WHERE ti.invited_by = v_actor
    AND ti.created_at >= now() - interval '24 hours';
  IF v_daily_count >= 10 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_RATE_LIMIT';
  END IF;

  INSERT INTO public.team_invitations (team_id, invited_by, invitee_id)
  VALUES (_team_id, v_actor, _invitee_id)
  RETURNING id INTO v_invitation_id;
  RETURN v_invitation_id;
END;
$$;

CREATE FUNCTION public.accept_team_invitation(_invitation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_invitation public.team_invitations%ROWTYPE;
  v_member_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;

  SELECT ti.team_id INTO v_team_id
  FROM public.team_invitations AS ti
  WHERE ti.id = _invitation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_NOT_FOUND';
  END IF;

  PERFORM t.id FROM public.teams AS t WHERE t.id = v_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;

  SELECT ti.* INTO v_invitation
  FROM public.team_invitations AS ti
  WHERE ti.id = _invitation_id
  FOR UPDATE;
  IF NOT FOUND OR v_invitation.invitee_id <> v_user_id
     OR v_invitation.status <> 'pending' THEN
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
  SET status = 'accepted', responded_at = now()
  WHERE id = _invitation_id;

  UPDATE public.team_join_requests
  SET
    status = CASE
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

CREATE FUNCTION public.decline_team_invitation(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  SELECT ti.team_id INTO v_team_id
  FROM public.team_invitations AS ti WHERE ti.id = _invitation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_NOT_FOUND';
  END IF;
  PERFORM t.id FROM public.teams AS t WHERE t.id = v_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  UPDATE public.team_invitations
  SET status = 'declined', responded_at = now()
  WHERE id = _invitation_id AND invitee_id = v_user_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_NOT_AVAILABLE';
  END IF;
END;
$$;

CREATE FUNCTION public.revoke_team_invitation(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  SELECT ti.team_id INTO v_team_id
  FROM public.team_invitations AS ti WHERE ti.id = _invitation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_NOT_FOUND';
  END IF;
  PERFORM t.id FROM public.teams AS t WHERE t.id = v_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  IF NOT public.is_team_manager(v_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_TEAM_MANAGER';
  END IF;
  UPDATE public.team_invitations
  SET status = 'revoked', responded_at = now()
  WHERE id = _invitation_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_NOT_PENDING';
  END IF;
END;
$$;

CREATE FUNCTION public.request_to_join_team(_team_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_pending_count integer;
  v_daily_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;

  PERFORM public.lock_team_rate_limit(v_user_id, 'join_request');

  PERFORM t.id FROM public.teams AS t WHERE t.id = _team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = _team_id AND tm.user_id = v_user_id AND tm.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ALREADY_TEAM_MEMBER';
  END IF;

  UPDATE public.teams
  SET collaboration_version = collaboration_version + 1
  WHERE id = _team_id;

  UPDATE public.team_join_requests AS tjr
  SET status = 'expired', responded_at = now()
  WHERE tjr.team_id = _team_id
    AND tjr.requester_id = v_user_id
    AND tjr.status = 'pending'
    AND tjr.expires_at <= now();

  SELECT tjr.id INTO v_request_id
  FROM public.team_join_requests AS tjr
  WHERE tjr.team_id = _team_id
    AND tjr.requester_id = v_user_id
    AND tjr.status = 'pending'
    AND tjr.expires_at > now();
  IF FOUND THEN
    RETURN v_request_id;
  END IF;

  SELECT count(*)::integer INTO v_pending_count
  FROM public.team_join_requests AS tjr
  WHERE tjr.team_id = _team_id AND tjr.status = 'pending' AND tjr.expires_at > now();
  IF v_pending_count >= 100 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_JOIN_REQUEST_LIMIT';
  END IF;

  SELECT count(*)::integer INTO v_daily_count
  FROM public.team_join_requests AS tjr
  WHERE tjr.requester_id = v_user_id
    AND tjr.created_at >= now() - interval '24 hours';
  IF v_daily_count >= 20 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'JOIN_REQUEST_RATE_LIMIT';
  END IF;

  INSERT INTO public.team_join_requests (team_id, requester_id)
  VALUES (_team_id, v_user_id)
  RETURNING id INTO v_request_id;
  RETURN v_request_id;
END;
$$;

CREATE FUNCTION public.approve_team_join_request(_request_id uuid)
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
    AND invitee_id = v_request.requester_id
    AND status = 'pending';
  RETURN v_team_id;
END;
$$;

CREATE FUNCTION public.decline_team_join_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_team_id uuid;
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
  UPDATE public.team_join_requests
  SET status = 'declined', responded_at = now()
  WHERE id = _request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'JOIN_REQUEST_NOT_PENDING';
  END IF;
END;
$$;

CREATE FUNCTION public.withdraw_team_join_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
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
  UPDATE public.team_join_requests
  SET status = 'withdrawn', responded_at = now()
  WHERE id = _request_id AND requester_id = v_user_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'JOIN_REQUEST_NOT_AVAILABLE';
  END IF;
END;
$$;

CREATE FUNCTION public.transfer_team_ownership(_team_id uuid, _new_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  PERFORM t.id FROM public.teams AS t WHERE t.id = _team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = _team_id AND tm.user_id = v_user_id
      AND tm.role = 'owner' AND tm.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_TEAM_OWNER';
  END IF;
  IF _new_owner_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_NEW_OWNER';
  END IF;
  IF _new_owner_id = v_user_id THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = _team_id AND tm.user_id = _new_owner_id
      AND tm.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'NEW_OWNER_MUST_BE_ACTIVE_MEMBER';
  END IF;

  UPDATE public.team_members
  SET role = 'admin'
  WHERE team_id = _team_id AND user_id = v_user_id AND role = 'owner' AND status = 'active';
  UPDATE public.team_members
  SET role = 'owner'
  WHERE team_id = _team_id AND user_id = _new_owner_id AND status = 'active';
END;
$$;

CREATE FUNCTION public.set_team_member_role(
  _team_id uuid,
  _member_id uuid,
  _role public.team_member_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_role public.team_member_role;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  PERFORM t.id FROM public.teams AS t WHERE t.id = _team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = _team_id AND tm.user_id = v_user_id
      AND tm.role = 'owner' AND tm.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_TEAM_OWNER';
  END IF;
  IF _role IS NULL OR _role = 'owner' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'USE_OWNERSHIP_TRANSFER';
  END IF;

  SELECT tm.role INTO v_current_role
  FROM public.team_members AS tm
  WHERE tm.team_id = _team_id AND tm.user_id = _member_id AND tm.status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACTIVE_MEMBER_NOT_FOUND';
  END IF;
  IF v_current_role = 'owner' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'USE_OWNERSHIP_TRANSFER';
  END IF;

  UPDATE public.team_members SET role = _role
  WHERE team_id = _team_id AND user_id = _member_id AND status = 'active';
END;
$$;

CREATE FUNCTION public.remove_team_member(_team_id uuid, _member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_actor_role public.team_member_role;
  v_target_role public.team_member_role;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  PERFORM t.id FROM public.teams AS t WHERE t.id = _team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  SELECT tm.role INTO v_actor_role
  FROM public.team_members AS tm
  WHERE tm.team_id = _team_id AND tm.user_id = v_user_id AND tm.status = 'active';
  IF NOT FOUND OR v_actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_TEAM_MANAGER';
  END IF;

  SELECT tm.role INTO v_target_role
  FROM public.team_members AS tm
  WHERE tm.team_id = _team_id AND tm.user_id = _member_id AND tm.status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACTIVE_MEMBER_NOT_FOUND';
  END IF;
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'OWNER_TRANSFER_REQUIRED';
  END IF;
  IF v_actor_role = 'admin' AND v_target_role <> 'member' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMINS_CAN_REMOVE_MEMBERS_ONLY';
  END IF;

  UPDATE public.team_members
  SET status = 'removed'
  WHERE team_id = _team_id AND user_id = _member_id AND status = 'active';
END;
$$;

CREATE FUNCTION public.leave_team(_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role public.team_member_role;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  PERFORM t.id FROM public.teams AS t WHERE t.id = _team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  SELECT tm.role INTO v_role
  FROM public.team_members AS tm
  WHERE tm.team_id = _team_id AND tm.user_id = v_user_id AND tm.status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACTIVE_MEMBER_NOT_FOUND';
  END IF;
  IF v_role = 'owner' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'OWNER_TRANSFER_REQUIRED';
  END IF;

  UPDATE public.team_members SET status = 'left'
  WHERE team_id = _team_id AND user_id = v_user_id AND status = 'active';
END;
$$;

CREATE FUNCTION public.delete_team(_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  PERFORM t.id FROM public.teams AS t WHERE t.id = _team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TEAM_NOT_FOUND';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = _team_id AND tm.user_id = v_user_id
      AND tm.role = 'owner' AND tm.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_TEAM_OWNER';
  END IF;
  DELETE FROM public.teams WHERE id = _team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_team_invitation(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_team_invitation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_team_invitation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_team_invitation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_to_join_team(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_team_join_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_team_join_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.withdraw_team_join_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_team_ownership(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_team_member_role(uuid, uuid, public.team_member_role)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_team_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_team(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_team(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_team(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_invitation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_team_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_team_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_to_join_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_team_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_team_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_team_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_team_ownership(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_team_member_role(uuid, uuid, public.team_member_role)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_team(uuid) TO authenticated;
