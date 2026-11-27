CREATE TYPE public.team_project_status AS ENUM (
  'planning', 'active', 'on_hold', 'completed', 'archived'
);
CREATE TYPE public.team_project_milestone_status AS ENUM (
  'pending', 'in_progress', 'completed'
);
CREATE TYPE public.team_project_task_status AS ENUM (
  'todo', 'in_progress', 'blocked', 'completed'
);
CREATE TYPE public.team_project_task_priority AS ENUM (
  'low', 'normal', 'high', 'urgent'
);
CREATE TYPE public.team_contribution_status AS ENUM (
  'pending', 'approved', 'disputed'
);

ALTER TABLE public.team_invitations
  ALTER COLUMN invitee_id DROP NOT NULL,
  ADD COLUMN invitee_email text;

UPDATE public.team_invitations AS invitation
SET invitee_email = lower(user_row.email)
FROM auth.users AS user_row
WHERE user_row.id = invitation.invitee_id
  AND invitation.invitee_email IS NULL;

ALTER TABLE public.team_invitations
  ADD CONSTRAINT team_invitations_email_format CHECK (
    invitee_email IS NULL OR (
      char_length(invitee_email) BETWEEN 3 AND 254
      AND invitee_email = lower(btrim(invitee_email))
      AND invitee_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  );

CREATE UNIQUE INDEX team_invitations_pending_email_idx
  ON public.team_invitations (team_id, invitee_email)
  WHERE status = 'pending' AND invitee_id IS NULL;

DROP POLICY IF EXISTS team_invitations_read ON public.team_invitations;
CREATE POLICY team_invitations_read
  ON public.team_invitations FOR SELECT TO authenticated
  USING (
    invitee_id = auth.uid()
    OR (
      invitee_id IS NULL
      AND invitee_email = lower(auth.jwt()->>'email')
    )
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
          AND invitation.invitee_email = lower(auth.jwt()->>'email')
        )
      )
  );
$$;

CREATE TABLE public.team_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 3000),
  objectives text NOT NULL DEFAULT '' CHECK (char_length(objectives) <= 3000),
  status public.team_project_status NOT NULL DEFAULT 'planning',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, id)
);

CREATE TABLE public.team_project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  due_at timestamptz,
  status public.team_project_milestone_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (team_id, project_id)
    REFERENCES public.team_projects(team_id, id) ON DELETE CASCADE,
  UNIQUE (team_id, project_id, id)
);

CREATE TABLE public.team_project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assignee_id uuid,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  due_at timestamptz,
  priority public.team_project_task_priority NOT NULL DEFAULT 'normal',
  status public.team_project_task_status NOT NULL DEFAULT 'todo',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (team_id, project_id)
    REFERENCES public.team_projects(team_id, id) ON DELETE CASCADE,
  FOREIGN KEY (team_id, assignee_id)
    REFERENCES public.team_members(team_id, user_id) ON DELETE RESTRICT,
  UNIQUE (team_id, project_id, id),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);

CREATE TABLE public.team_project_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  project_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (team_id, project_id)
    REFERENCES public.team_projects(team_id, id) ON DELETE CASCADE
);

CREATE TABLE public.team_project_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  resource_type text NOT NULL CHECK (resource_type IN ('link', 'attachment')),
  resource_url text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (team_id, project_id)
    REFERENCES public.team_projects(team_id, id) ON DELETE CASCADE,
  CHECK (
    (resource_type = 'link'
      AND resource_url IS NOT NULL
      AND length(resource_url) <= 2048
      AND resource_url ~ '^https?://[^[:space:]]+$'
      AND storage_path IS NULL)
    OR
    (resource_type = 'attachment'
      AND resource_url IS NULL
      AND storage_path IS NOT NULL
      AND length(storage_path) <= 512)
  )
);

CREATE TABLE public.team_project_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id uuid,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type text NOT NULL CHECK (
    activity_type IN (
      'project_created', 'project_updated', 'milestone_created',
      'milestone_updated', 'task_created', 'task_updated',
      'message_sent', 'resource_added', 'contribution_submitted',
      'contribution_reviewed'
    )
  ),
  target_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(details) = 'object' AND octet_length(details::text) <= 4000
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (team_id, project_id)
    REFERENCES public.team_projects(team_id, id) ON DELETE CASCADE
);

CREATE TABLE public.team_project_message_rate_guard (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  touched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE public.team_project_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  project_id uuid NOT NULL,
  task_id uuid NOT NULL,
  contributor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  studyflow_branch_id text,
  studyflow_item_id text,
  summary text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 1 AND 1000),
  evidence text NOT NULL CHECK (char_length(btrim(evidence)) BETWEEN 1 AND 4000),
  status public.team_contribution_status NOT NULL DEFAULT 'pending',
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes text NOT NULL DEFAULT '' CHECK (char_length(review_notes) <= 1200),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (team_id, project_id, task_id)
    REFERENCES public.team_project_tasks(team_id, project_id, id) ON DELETE CASCADE,
  UNIQUE (id, contributor_id),
  CHECK ((studyflow_branch_id IS NULL) = (studyflow_item_id IS NULL)),
  CHECK (
    (status = 'pending' AND reviewer_id IS NULL AND reviewed_at IS NULL)
    OR
    (status IN ('approved', 'disputed')
      AND reviewer_id IS NOT NULL
      AND reviewer_id <> contributor_id
      AND reviewed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX team_project_contributions_open_task_idx
  ON public.team_project_contributions (task_id, contributor_id)
  WHERE status IN ('pending', 'approved');

CREATE TABLE public.team_contribution_portfolio (
  contribution_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_snapshot text NOT NULL CHECK (char_length(btrim(title_snapshot)) BETWEEN 1 AND 160),
  evidence_snapshot text NOT NULL CHECK (char_length(btrim(evidence_snapshot)) BETWEEN 1 AND 4000),
  consented_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (contribution_id, user_id)
    REFERENCES public.team_project_contributions(id, contributor_id) ON DELETE CASCADE
);

CREATE INDEX team_projects_team_updated_idx
  ON public.team_projects (team_id, updated_at DESC);
CREATE INDEX team_project_tasks_project_status_idx
  ON public.team_project_tasks (project_id, status, due_at);
CREATE INDEX team_project_tasks_assignee_idx
  ON public.team_project_tasks (assignee_id, status, due_at);
CREATE INDEX team_project_messages_project_created_idx
  ON public.team_project_messages (project_id, created_at DESC);
CREATE INDEX team_project_activity_team_created_idx
  ON public.team_project_activity (team_id, created_at DESC);
CREATE INDEX team_project_contributions_review_idx
  ON public.team_project_contributions (team_id, status, created_at DESC);

ALTER TABLE public.team_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_project_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_project_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_project_message_rate_guard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_project_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_contribution_portfolio ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.team_projects,
  public.team_project_milestones,
  public.team_project_tasks,
  public.team_project_messages,
  public.team_project_resources,
  public.team_project_activity,
  public.team_project_message_rate_guard,
  public.team_project_contributions,
  public.team_contribution_portfolio
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.team_projects,
  public.team_project_milestones,
  public.team_project_tasks,
  public.team_project_messages,
  public.team_project_resources,
  public.team_project_activity,
  public.team_project_contributions
TO authenticated;
GRANT SELECT ON TABLE public.team_contribution_portfolio TO authenticated;
GRANT ALL ON TABLE
  public.team_projects,
  public.team_project_milestones,
  public.team_project_tasks,
  public.team_project_messages,
  public.team_project_resources,
  public.team_project_activity,
  public.team_project_message_rate_guard,
  public.team_project_contributions,
  public.team_contribution_portfolio
TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.team_project_activity_id_seq TO service_role;

CREATE POLICY team_projects_member_read
  ON public.team_projects FOR SELECT TO authenticated
  USING (public.is_active_team_member(team_id));
CREATE POLICY team_project_milestones_member_read
  ON public.team_project_milestones FOR SELECT TO authenticated
  USING (public.is_active_team_member(team_id));
CREATE POLICY team_project_tasks_member_read
  ON public.team_project_tasks FOR SELECT TO authenticated
  USING (public.is_active_team_member(team_id));
CREATE POLICY team_project_messages_member_read
  ON public.team_project_messages FOR SELECT TO authenticated
  USING (public.is_active_team_member(team_id));
CREATE POLICY team_project_resources_member_read
  ON public.team_project_resources FOR SELECT TO authenticated
  USING (public.is_active_team_member(team_id));
CREATE POLICY team_project_activity_member_read
  ON public.team_project_activity FOR SELECT TO authenticated
  USING (public.is_active_team_member(team_id));
CREATE POLICY team_project_contributions_member_read
  ON public.team_project_contributions FOR SELECT TO authenticated
  USING (public.is_active_team_member(team_id));
CREATE POLICY team_contribution_portfolio_owner_read
  ON public.team_contribution_portfolio FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE FUNCTION public.can_manage_team_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.team_projects AS project
    JOIN public.team_members AS member
      ON member.team_id = project.team_id
     AND member.user_id = auth.uid()
     AND member.status = 'active'
    WHERE project.id = _project_id
      AND (member.role IN ('owner', 'admin') OR project.created_by = auth.uid())
  );
$$;

CREATE FUNCTION public.is_team_attachment_path(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_parts text[] := storage.foldername(_name);
  v_team_id uuid;
  v_project_id uuid;
BEGIN
  IF coalesce(array_length(v_parts, 1), 0) <> 3
     OR v_parts[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     OR v_parts[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     OR v_parts[3] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;
  v_team_id := v_parts[1]::uuid;
  v_project_id := v_parts[2]::uuid;
  RETURN public.is_active_team_member(v_team_id)
    AND EXISTS (
      SELECT 1 FROM public.team_projects AS project
      WHERE project.id = v_project_id AND project.team_id = v_team_id
    );
END;
$$;

CREATE FUNCTION public.can_delete_team_attachment(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_parts text[] := storage.foldername(_name);
BEGIN
  IF NOT public.is_team_attachment_path(_name) THEN
    RETURN false;
  END IF;
  IF v_parts[3] = auth.uid()::text THEN
    RETURN true;
  END IF;
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN public.can_manage_team_project(v_parts[2]::uuid);
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_team_project(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_team_attachment_path(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_delete_team_attachment(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_team_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_attachment_path(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_team_attachment(text) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-attachments',
  'team-attachments',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS team_attachments_member_read ON storage.objects;
CREATE POLICY team_attachments_member_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'team-attachments'
    AND public.is_team_attachment_path(name)
  );

DROP POLICY IF EXISTS team_attachments_member_upload ON storage.objects;
CREATE POLICY team_attachments_member_upload
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'team-attachments'
    AND public.is_team_attachment_path(name)
    AND (storage.foldername(name))[3] = auth.uid()::text
  );

DROP POLICY IF EXISTS team_attachments_member_delete ON storage.objects;
CREATE POLICY team_attachments_member_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'team-attachments'
    AND public.can_delete_team_attachment(name)
  );

CREATE FUNCTION public.write_team_project_activity(
  _team_id uuid,
  _project_id uuid,
  _activity_type text,
  _target_id uuid,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.team_project_activity
    (team_id, project_id, actor_id, activity_type, target_id, details)
  VALUES (
    _team_id, _project_id, auth.uid(), _activity_type, _target_id,
    coalesce(_details, '{}'::jsonb)
  );
$$;

CREATE FUNCTION public.update_team(
  _team_id uuid,
  _name text,
  _is_discoverable boolean
)
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
  IF NOT public.is_team_manager(_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_TEAM_MANAGER';
  END IF;
  IF _name IS NULL OR char_length(btrim(_name)) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_TEAM_NAME';
  END IF;
  UPDATE public.teams
  SET name = btrim(_name),
      is_discoverable = coalesce(_is_discoverable, false),
      collaboration_version = collaboration_version + 1
  WHERE id = _team_id;
END;
$$;

CREATE FUNCTION public.create_team_invitation_by_email(
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
  WHERE lower(user_row.email) = v_email;
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
  v_user_email text := lower(auth.jwt()->>'email');
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
       v_invitation.invitee_id = v_user_id
       OR (
         v_invitation.invitee_id IS NULL
         AND v_invitation.invitee_email = v_user_email
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
  v_user_email text := lower(auth.jwt()->>'email');
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

CREATE FUNCTION public.create_team_project(
  _team_id uuid,
  _name text,
  _description text DEFAULT '',
  _objectives text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_project_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  IF NOT public.is_active_team_member(_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_ACTIVE_TEAM_MEMBER';
  END IF;
  INSERT INTO public.team_projects (team_id, created_by, name, description, objectives)
  VALUES (_team_id, v_user_id, btrim(_name), coalesce(_description, ''), coalesce(_objectives, ''))
  RETURNING id INTO v_project_id;
  PERFORM public.write_team_project_activity(
    _team_id, v_project_id, 'project_created', v_project_id,
    jsonb_build_object('name', btrim(_name))
  );
  RETURN v_project_id;
END;
$$;

CREATE FUNCTION public.update_team_project(
  _project_id uuid,
  _name text,
  _description text,
  _objectives text,
  _status public.team_project_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  SELECT project.team_id INTO v_team_id
  FROM public.team_projects AS project
  WHERE project.id = _project_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PROJECT_NOT_FOUND';
  END IF;
  IF NOT public.can_manage_team_project(_project_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_PROJECT_MANAGER';
  END IF;
  UPDATE public.team_projects
  SET name = btrim(_name),
      description = coalesce(_description, ''),
      objectives = coalesce(_objectives, ''),
      status = _status,
      updated_at = now()
  WHERE id = _project_id;
  PERFORM public.write_team_project_activity(
    v_team_id, _project_id, 'project_updated', _project_id,
    jsonb_build_object('status', _status)
  );
END;
$$;

CREATE FUNCTION public.create_team_project_milestone(
  _project_id uuid,
  _title text,
  _description text DEFAULT '',
  _due_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_milestone_id uuid;
BEGIN
  SELECT project.team_id INTO v_team_id
  FROM public.team_projects AS project
  WHERE project.id = _project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PROJECT_NOT_FOUND';
  END IF;
  IF v_user_id IS NULL OR NOT public.can_manage_team_project(_project_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_PROJECT_MANAGER';
  END IF;
  INSERT INTO public.team_project_milestones
    (team_id, project_id, created_by, title, description, due_at)
  VALUES
    (v_team_id, _project_id, v_user_id, btrim(_title), coalesce(_description, ''), _due_at)
  RETURNING id INTO v_milestone_id;
  PERFORM public.write_team_project_activity(
    v_team_id, _project_id, 'milestone_created', v_milestone_id,
    jsonb_build_object('title', btrim(_title))
  );
  RETURN v_milestone_id;
END;
$$;

CREATE FUNCTION public.update_team_project_milestone(
  _milestone_id uuid,
  _title text,
  _description text,
  _due_at timestamptz,
  _status public.team_project_milestone_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_team_id uuid;
  v_project_id uuid;
BEGIN
  SELECT milestone.team_id, milestone.project_id
  INTO v_team_id, v_project_id
  FROM public.team_project_milestones AS milestone
  WHERE milestone.id = _milestone_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'MILESTONE_NOT_FOUND';
  END IF;
  IF NOT public.can_manage_team_project(v_project_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_PROJECT_MANAGER';
  END IF;
  UPDATE public.team_project_milestones
  SET title = btrim(_title),
      description = coalesce(_description, ''),
      due_at = _due_at,
      status = _status,
      updated_at = now()
  WHERE id = _milestone_id;
  PERFORM public.write_team_project_activity(
    v_team_id, v_project_id, 'milestone_updated', _milestone_id,
    jsonb_build_object('status', _status)
  );
END;
$$;

CREATE FUNCTION public.create_team_project_task(
  _project_id uuid,
  _title text,
  _description text DEFAULT '',
  _assignee_id uuid DEFAULT NULL,
  _due_at timestamptz DEFAULT NULL,
  _priority public.team_project_task_priority DEFAULT 'normal'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_task_id uuid;
BEGIN
  SELECT project.team_id INTO v_team_id
  FROM public.team_projects AS project
  WHERE project.id = _project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PROJECT_NOT_FOUND';
  END IF;
  IF v_user_id IS NULL OR NOT public.is_active_team_member(v_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_ACTIVE_TEAM_MEMBER';
  END IF;
  IF _assignee_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.team_members AS member
      WHERE member.team_id = v_team_id
        AND member.user_id = _assignee_id
        AND member.status = 'active'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSIGNEE_NOT_ACTIVE_TEAM_MEMBER';
    END IF;
    IF _assignee_id <> v_user_id
       AND NOT public.can_manage_team_project(_project_id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ONLY_MANAGERS_CAN_ASSIGN_OTHERS';
    END IF;
  END IF;
  INSERT INTO public.team_project_tasks
    (team_id, project_id, created_by, assignee_id, title, description, due_at, priority)
  VALUES
    (v_team_id, _project_id, v_user_id, _assignee_id, btrim(_title),
     coalesce(_description, ''), _due_at, coalesce(_priority, 'normal'))
  RETURNING id INTO v_task_id;
  PERFORM public.write_team_project_activity(
    v_team_id, _project_id, 'task_created', v_task_id,
    jsonb_build_object('title', btrim(_title), 'assignee_id', _assignee_id)
  );
  RETURN v_task_id;
END;
$$;

CREATE FUNCTION public.update_team_project_task_details(
  _task_id uuid,
  _title text,
  _description text,
  _assignee_id uuid,
  _due_at timestamptz,
  _priority public.team_project_task_priority
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_team_id uuid;
  v_project_id uuid;
BEGIN
  SELECT task.team_id, task.project_id INTO v_team_id, v_project_id
  FROM public.team_project_tasks AS task
  WHERE task.id = _task_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TASK_NOT_FOUND';
  END IF;
  IF NOT public.can_manage_team_project(v_project_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_PROJECT_MANAGER';
  END IF;
  IF _assignee_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.team_members AS member
    WHERE member.team_id = v_team_id
      AND member.user_id = _assignee_id
      AND member.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSIGNEE_NOT_ACTIVE_TEAM_MEMBER';
  END IF;
  UPDATE public.team_project_tasks
  SET title = btrim(_title),
      description = coalesce(_description, ''),
      assignee_id = _assignee_id,
      due_at = _due_at,
      priority = _priority,
      updated_at = now()
  WHERE id = _task_id;
  PERFORM public.write_team_project_activity(
    v_team_id, v_project_id, 'task_updated', _task_id,
    jsonb_build_object('assignee_id', _assignee_id, 'priority', _priority)
  );
END;
$$;

CREATE FUNCTION public.set_team_project_task_status(
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
  IF v_user_id <> v_assignee_id AND NOT public.can_manage_team_project(v_project_id) THEN
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

CREATE FUNCTION public.claim_team_project_task(_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_project_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  SELECT task.team_id, task.project_id INTO v_team_id, v_project_id
  FROM public.team_project_tasks AS task
  WHERE task.id = _task_id
  FOR UPDATE;
  IF NOT FOUND OR NOT public.is_active_team_member(v_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_ACTIVE_TEAM_MEMBER';
  END IF;
  UPDATE public.team_project_tasks
  SET assignee_id = v_user_id, updated_at = now()
  WHERE id = _task_id AND assignee_id IS NULL AND status <> 'completed';
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TASK_ALREADY_ASSIGNED_OR_COMPLETE';
  END IF;
  PERFORM public.write_team_project_activity(
    v_team_id, v_project_id, 'task_updated', _task_id,
    jsonb_build_object('assignee_id', v_user_id, 'claimed', true)
  );
END;
$$;

CREATE FUNCTION public.send_team_project_message(
  _project_id uuid,
  _body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_message_id uuid;
  v_recent_count integer;
  v_daily_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  IF char_length(btrim(_body)) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_MESSAGE';
  END IF;
  SELECT project.team_id INTO v_team_id
  FROM public.team_projects AS project
  WHERE project.id = _project_id
  FOR UPDATE;
  IF NOT FOUND OR NOT public.is_active_team_member(v_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_ACTIVE_TEAM_MEMBER';
  END IF;
  INSERT INTO public.team_project_message_rate_guard (team_id, user_id)
  VALUES (v_team_id, v_user_id)
  ON CONFLICT (team_id, user_id) DO NOTHING;
  PERFORM guard_row.team_id
  FROM public.team_project_message_rate_guard AS guard_row
  WHERE guard_row.team_id = v_team_id AND guard_row.user_id = v_user_id
  FOR UPDATE;
  SELECT count(*)::integer INTO v_recent_count
  FROM public.team_project_messages AS message
  WHERE message.team_id = v_team_id
    AND message.author_id = v_user_id
    AND message.created_at >= now() - interval '1 minute';
  SELECT count(*)::integer INTO v_daily_count
  FROM public.team_project_messages AS message
  WHERE message.team_id = v_team_id
    AND message.author_id = v_user_id
    AND message.created_at >= now() - interval '24 hours';
  IF v_recent_count >= 20 OR v_daily_count >= 200 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'MESSAGE_RATE_LIMIT';
  END IF;
  INSERT INTO public.team_project_messages (team_id, project_id, author_id, body)
  VALUES (v_team_id, _project_id, v_user_id, btrim(_body))
  RETURNING id INTO v_message_id;
  PERFORM public.write_team_project_activity(
    v_team_id, _project_id, 'message_sent', v_message_id, '{}'::jsonb
  );
  RETURN v_message_id;
END;
$$;

CREATE FUNCTION public.create_team_project_resource(
  _project_id uuid,
  _title text,
  _description text,
  _resource_type text,
  _resource_url text,
  _storage_path text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_resource_id uuid;
BEGIN
  SELECT project.team_id INTO v_team_id
  FROM public.team_projects AS project
  WHERE project.id = _project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PROJECT_NOT_FOUND';
  END IF;
  IF v_user_id IS NULL OR NOT public.is_active_team_member(v_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_ACTIVE_TEAM_MEMBER';
  END IF;
  IF _resource_type = 'attachment' AND (
    _storage_path IS NULL
    OR split_part(_storage_path, '/', 1) <> v_team_id::text
    OR split_part(_storage_path, '/', 2) <> _project_id::text
    OR split_part(_storage_path, '/', 3) <> v_user_id::text
    OR NOT public.is_team_attachment_path(_storage_path)
    OR NOT EXISTS (
      SELECT 1 FROM storage.objects AS object
      WHERE object.bucket_id = 'team-attachments'
        AND object.name = _storage_path
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ATTACHMENT_NOT_OWNED_BY_MEMBER';
  END IF;
  INSERT INTO public.team_project_resources
    (team_id, project_id, created_by, title, description, resource_type, resource_url, storage_path)
  VALUES
    (v_team_id, _project_id, v_user_id, btrim(_title), coalesce(_description, ''),
     _resource_type, _resource_url, _storage_path)
  RETURNING id INTO v_resource_id;
  PERFORM public.write_team_project_activity(
    v_team_id, _project_id, 'resource_added', v_resource_id,
    jsonb_build_object('title', btrim(_title), 'resource_type', _resource_type)
  );
  RETURN v_resource_id;
END;
$$;

CREATE FUNCTION public.submit_team_project_contribution(
  _task_id uuid,
  _summary text,
  _evidence text,
  _studyflow_item_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_project_id uuid;
  v_assignee_id uuid;
  v_branch_id text;
  v_contribution_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  SELECT task.team_id, task.project_id, task.assignee_id
  INTO v_team_id, v_project_id, v_assignee_id
  FROM public.team_project_tasks AS task
  WHERE task.id = _task_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TASK_NOT_FOUND';
  END IF;
  IF v_assignee_id IS DISTINCT FROM v_user_id
     OR NOT public.is_active_team_member(v_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CONTRIBUTION_REQUIRES_ASSIGNED_MEMBER';
  END IF;
  IF _studyflow_item_id IS NOT NULL THEN
    SELECT progress.selected_path INTO v_branch_id
    FROM public.user_progress AS progress
    WHERE progress.user_id = v_user_id;
    IF v_branch_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.atlas_studyflows AS flow,
           jsonb_array_elements(coalesce(flow.active_roadmap->'objectives', '[]'::jsonb)) AS objective(value),
           jsonb_array_elements(coalesce(objective.value->'stages', '[]'::jsonb)) AS stage(value),
           jsonb_array_elements(coalesce(stage.value->'lessons', '[]'::jsonb)) AS lesson(value)
      WHERE flow.user_id = v_user_id
        AND flow.branch_id = v_branch_id
        AND flow.status = 'active'
        AND lesson.value->>'id' = _studyflow_item_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'STUDYFLOW_OBJECTIVE_NOT_FOUND';
    END IF;
  END IF;
  INSERT INTO public.team_project_contributions
    (team_id, project_id, task_id, contributor_id, studyflow_branch_id,
     studyflow_item_id, summary, evidence)
  VALUES
    (v_team_id, v_project_id, _task_id, v_user_id, v_branch_id,
     _studyflow_item_id, btrim(_summary), btrim(_evidence))
  RETURNING id INTO v_contribution_id;
  PERFORM public.write_team_project_activity(
    v_team_id, v_project_id, 'contribution_submitted', v_contribution_id,
    jsonb_build_object('task_id', _task_id, 'summary', btrim(_summary))
  );
  RETURN v_contribution_id;
END;
$$;

CREATE FUNCTION public.review_team_project_contribution(
  _contribution_id uuid,
  _approve boolean,
  _review_notes text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_contribution public.team_project_contributions%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  SELECT contribution.* INTO v_contribution
  FROM public.team_project_contributions AS contribution
  WHERE contribution.id = _contribution_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CONTRIBUTION_NOT_FOUND';
  END IF;
  IF v_user_id = v_contribution.contributor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SELF_REVIEW_FORBIDDEN';
  END IF;
  IF NOT public.is_team_manager(v_contribution.team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_TEAM_REVIEWER';
  END IF;
  IF v_contribution.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CONTRIBUTION_ALREADY_REVIEWED';
  END IF;
  IF char_length(coalesce(_review_notes, '')) > 1200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'REVIEW_NOTES_TOO_LONG';
  END IF;
  UPDATE public.team_project_contributions
  SET status = CASE WHEN _approve THEN 'approved'::public.team_contribution_status
                    ELSE 'disputed'::public.team_contribution_status END,
      reviewer_id = v_user_id,
      review_notes = coalesce(_review_notes, ''),
      reviewed_at = now()
  WHERE id = _contribution_id;
  PERFORM public.write_team_project_activity(
    v_contribution.team_id, v_contribution.project_id,
    'contribution_reviewed', _contribution_id,
    jsonb_build_object('status', CASE WHEN _approve THEN 'approved' ELSE 'disputed' END)
  );
END;
$$;

CREATE FUNCTION public.set_team_contribution_portfolio_consent(
  _contribution_id uuid,
  _consent boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_contribution public.team_project_contributions%ROWTYPE;
  v_title text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  SELECT contribution.* INTO v_contribution
  FROM public.team_project_contributions AS contribution
  WHERE contribution.id = _contribution_id
    AND contribution.contributor_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_CONTRIBUTION_OWNER';
  END IF;
  IF _consent THEN
    IF v_contribution.status <> 'approved' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CONTRIBUTION_NOT_APPROVED';
    END IF;
    SELECT task.title INTO v_title
    FROM public.team_project_tasks AS task
    WHERE task.id = v_contribution.task_id;
    INSERT INTO public.team_contribution_portfolio
      (contribution_id, user_id, title_snapshot, evidence_snapshot)
    VALUES (_contribution_id, v_user_id, v_title, v_contribution.evidence)
    ON CONFLICT (contribution_id) DO NOTHING;
  ELSE
    DELETE FROM public.team_contribution_portfolio AS portfolio
    WHERE portfolio.contribution_id = _contribution_id
      AND portfolio.user_id = v_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.write_team_project_activity(uuid, uuid, text, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_team(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_team_invitation_by_email(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_team_project(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_team_project(uuid, text, text, text, public.team_project_status)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_team_project_milestone(uuid, text, text, timestamptz)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_team_project_milestone(
  uuid, text, text, timestamptz, public.team_project_milestone_status
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_team_project_task(
  uuid, text, text, uuid, timestamptz, public.team_project_task_priority
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_team_project_task_details(
  uuid, text, text, uuid, timestamptz, public.team_project_task_priority
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_team_project_task_status(uuid, public.team_project_task_status)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_team_project_task(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_team_project_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_team_project_resource(
  uuid, text, text, text, text, text
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_team_project_contribution(uuid, text, text, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_team_project_contribution(uuid, boolean, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_team_contribution_portfolio_consent(uuid, boolean)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.update_team(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_invitation_by_email(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_project(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_team_project(uuid, text, text, text, public.team_project_status)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_project_milestone(uuid, text, text, timestamptz)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_team_project_milestone(
  uuid, text, text, timestamptz, public.team_project_milestone_status
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_project_task(
  uuid, text, text, uuid, timestamptz, public.team_project_task_priority
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_team_project_task_details(
  uuid, text, text, uuid, timestamptz, public.team_project_task_priority
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_team_project_task_status(uuid, public.team_project_task_status)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_team_project_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_team_project_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_project_resource(
  uuid, text, text, text, text, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_team_project_contribution(uuid, text, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_team_project_contribution(uuid, boolean, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_team_contribution_portfolio_consent(uuid, boolean)
  TO authenticated;
