import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { createTeamAttachmentPath, normalizeTeamResourceUrl } from "./workspaceValidation";

export { createTeamAttachmentPath, normalizeTeamResourceUrl } from "./workspaceValidation";

export type CollaborationTeam = Tables<"teams">;
export type TeamMember = Tables<"team_members">;
export type TeamInvitation = Tables<"team_invitations">;
export type TeamJoinRequest = Tables<"team_join_requests">;
export type TeamProject = Tables<"team_projects">;
export type TeamProjectMilestone = Tables<"team_project_milestones">;
export type TeamProjectTask = Tables<"team_project_tasks">;
export type TeamProjectMessage = Tables<"team_project_messages">;
export type TeamProjectResource = Tables<"team_project_resources">;
export type TeamProjectActivity = Tables<"team_project_activity">;
export type TeamProjectContribution = Tables<"team_project_contributions">;
export type TeamContributionPortfolio = Tables<"team_contribution_portfolio">;
export type TeamMemberRole = Enums<"team_member_role">;
export type TeamProjectStatus = Enums<"team_project_status">;
export type TeamProjectTaskStatus = Enums<"team_project_task_status">;
export type TeamProjectTaskPriority = Enums<"team_project_task_priority">;
export type TeamProjectStatusValue = Enums<"team_project_status">;
export type TeamProjectMilestoneStatus = Enums<"team_project_milestone_status">;

const nameSchema = z.string().trim().min(1).max(120);
const detailSchema = z.string().trim().max(3000);
const emailSchema = z.string().trim().email().max(254);
const attachmentMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
]);
const attachmentLimitBytes = 10 * 1024 * 1024;

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error || data == null) throw new Error(error?.message ?? "The collaboration request returned no data.");
  return data;
}

export async function loadTeamHome(userId: string, email: string | null) {
  const [memberResult, invitationIdResult, joinRequestResult, discoverableResult] = await Promise.all([
    supabase.from("team_members").select("*").eq("user_id", userId).eq("status", "active"),
    supabase.from("team_invitations")
      .select("*")
      .eq("invitee_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("team_join_requests")
      .select("*")
      .eq("requester_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("teams")
      .select("*")
      .eq("is_discoverable", true)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (memberResult.error || invitationIdResult.error || joinRequestResult.error || discoverableResult.error) {
    throw memberResult.error ?? invitationIdResult.error ?? joinRequestResult.error ?? discoverableResult.error;
  }

  const memberships = memberResult.data;
  const teamIds = memberships.map((member) => member.team_id);
  const [teamsResult, emailInvitationResult] = await Promise.all([
    teamIds.length
      ? supabase.from("teams").select("*").in("id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    email && email !== ""
      ? supabase.from("team_invitations")
        .select("*")
        .eq("invitee_email", email.trim().toLowerCase())
        .is("invitee_id", null)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (teamsResult.error || emailInvitationResult.error) throw teamsResult.error ?? emailInvitationResult.error;

  const invitations = [...invitationIdResult.data, ...emailInvitationResult.data]
    .filter((invitation, index, list) => list.findIndex((entry) => entry.id === invitation.id) === index);
  const invitedTeamIds = [...new Set(invitations.map((invitation) => invitation.team_id))];
  const invitedTeamsResult = invitedTeamIds.length
    ? await supabase.from("teams").select("*").in("id", invitedTeamIds)
    : { data: [], error: null };
  if (invitedTeamsResult.error) throw invitedTeamsResult.error;
  const teams = [...teamsResult.data, ...invitedTeamsResult.data]
    .filter((team, index, list) => list.findIndex((entry) => entry.id === team.id) === index);
  return {
    memberships,
    teams,
    invitations,
    joinRequests: joinRequestResult.data,
    discoverableTeams: discoverableResult.data,
  };
}

export async function loadTeamWorkspace(teamId: string) {
  const [teamResult, memberResult, projectResult, invitationResult, joinRequestResult] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).maybeSingle(),
    supabase.from("team_members").select("*").eq("team_id", teamId).eq("status", "active").order("joined_at"),
    supabase.from("team_projects").select("*").eq("team_id", teamId).order("updated_at", { ascending: false }),
    supabase.from("team_invitations").select("*").eq("team_id", teamId).eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("team_join_requests").select("*").eq("team_id", teamId).eq("status", "pending").order("created_at", { ascending: false }),
  ]);
  if (teamResult.error || memberResult.error || projectResult.error || invitationResult.error || joinRequestResult.error) {
    throw teamResult.error ?? memberResult.error ?? projectResult.error ?? invitationResult.error ?? joinRequestResult.error;
  }
  return {
    team: teamResult.data,
    members: memberResult.data,
    projects: projectResult.data,
    invitations: invitationResult.data,
    joinRequests: joinRequestResult.data,
  };
}

export async function loadTeamProjectWorkspace(teamId: string, projectId: string, userId: string) {
  const [milestoneResult, taskResult, messageResult, resourceResult, activityResult, contributionResult, portfolioResult] = await Promise.all([
    supabase.from("team_project_milestones").select("*").eq("team_id", teamId).eq("project_id", projectId).order("due_at"),
    supabase.from("team_project_tasks").select("*").eq("team_id", teamId).eq("project_id", projectId).order("created_at", { ascending: false }).limit(200),
    supabase.from("team_project_messages").select("*").eq("team_id", teamId).eq("project_id", projectId).order("created_at", { ascending: false }).limit(100),
    supabase.from("team_project_resources").select("*").eq("team_id", teamId).eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("team_project_activity").select("*").eq("team_id", teamId).eq("project_id", projectId).order("created_at", { ascending: false }).limit(50),
    supabase.from("team_project_contributions").select("*").eq("team_id", teamId).eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("team_contribution_portfolio").select("*").eq("user_id", userId),
  ]);
  if (
    milestoneResult.error || taskResult.error || messageResult.error ||
    resourceResult.error || activityResult.error || contributionResult.error || portfolioResult.error
  ) {
    throw milestoneResult.error ?? taskResult.error ?? messageResult.error ??
      resourceResult.error ?? activityResult.error ?? contributionResult.error ?? portfolioResult.error;
  }
  return {
    milestones: milestoneResult.data,
    tasks: taskResult.data,
    messages: messageResult.data.reverse(),
    resources: resourceResult.data,
    activity: activityResult.data,
    contributions: contributionResult.data,
    portfolio: portfolioResult.data,
  };
}

export async function createTeam(name: string, discoverable: boolean) {
  const validName = z.string().trim().min(1).max(80).parse(name);
  const { data, error } = await supabase.rpc("create_team", {
    _name: validName,
    _is_discoverable: discoverable,
  });
  return requireData(data, error);
}

export async function createTeamProject(teamId: string, name: string, description: string, objectives: string) {
  const validName = nameSchema.parse(name);
  const validDescription = detailSchema.parse(description);
  const validObjectives = detailSchema.parse(objectives);
  const { data, error } = await supabase.rpc("create_team_project", {
    _team_id: teamId,
    _name: validName,
    _description: validDescription,
    _objectives: validObjectives,
  });
  return requireData(data, error);
}

export async function updateTeamProject(input: {
  projectId: string;
  name: string;
  description: string;
  objectives: string;
  status: TeamProjectStatusValue;
}) {
  const { error } = await supabase.rpc("update_team_project", {
    _project_id: input.projectId,
    _name: nameSchema.parse(input.name),
    _description: detailSchema.parse(input.description),
    _objectives: detailSchema.parse(input.objectives),
    _status: input.status,
  });
  if (error) throw error;
}

export async function inviteToTeam(teamId: string, email: string) {
  const validEmail = emailSchema.parse(email).toLowerCase();
  const { data, error } = await supabase.rpc("create_team_invitation_by_email", {
    _team_id: teamId,
    _invitee_email: validEmail,
  });
  return requireData(data, error);
}

export async function createProjectTask(input: {
  projectId: string;
  title: string;
  description: string;
  assigneeId: string | null;
  dueAt: string | null;
  priority: TeamProjectTaskPriority;
}) {
  const { data, error } = await supabase.rpc("create_team_project_task", {
    _project_id: input.projectId,
    _title: nameSchema.parse(input.title),
    _description: detailSchema.parse(input.description),
    _assignee_id: input.assigneeId,
    _due_at: input.dueAt,
    _priority: input.priority,
  });
  return requireData(data, error);
}

export async function claimProjectTask(taskId: string) {
  const { error } = await supabase.rpc("claim_team_project_task", { _task_id: taskId });
  if (error) throw error;
}

export async function updateProjectTaskDetails(input: {
  taskId: string;
  title: string;
  description: string;
  assigneeId: string | null;
  dueAt: string | null;
  priority: TeamProjectTaskPriority;
}) {
  const { error } = await supabase.rpc("update_team_project_task_details", {
    _task_id: input.taskId,
    _title: nameSchema.parse(input.title),
    _description: detailSchema.parse(input.description),
    _assignee_id: input.assigneeId,
    _due_at: input.dueAt,
    _priority: input.priority,
  });
  if (error) throw error;
}

export async function setProjectTaskStatus(taskId: string, status: TeamProjectTaskStatus) {
  const { error } = await supabase.rpc("set_team_project_task_status", {
    _task_id: taskId,
    _status: status,
  });
  if (error) throw error;
}

export async function setTeamContributionPortfolioConsent(contributionId: string, consent: boolean) {
  const { error } = await supabase.rpc("set_team_contribution_portfolio_consent", {
    _contribution_id: contributionId,
    _consent: consent,
  });
  if (error) throw error;
}

export async function createProjectMilestone(input: {
  projectId: string;
  title: string;
  description: string;
  dueAt: string | null;
}) {
  const { data, error } = await supabase.rpc("create_team_project_milestone", {
    _project_id: input.projectId,
    _title: nameSchema.parse(input.title),
    _description: detailSchema.parse(input.description),
    _due_at: input.dueAt,
  });
  return requireData(data, error);
}

export async function updateProjectMilestone(input: {
  milestoneId: string;
  title: string;
  description: string;
  dueAt: string | null;
  status: TeamProjectMilestoneStatus;
}) {
  const { error } = await supabase.rpc("update_team_project_milestone", {
    _milestone_id: input.milestoneId,
    _title: nameSchema.parse(input.title),
    _description: detailSchema.parse(input.description),
    _due_at: input.dueAt,
    _status: input.status,
  });
  if (error) throw error;
}

export async function sendProjectMessage(projectId: string, body: string) {
  const validBody = z.string().trim().min(1).max(4000).parse(body);
  const { data, error } = await supabase.rpc("send_team_project_message", {
    _project_id: projectId,
    _body: validBody,
  });
  return requireData(data, error);
}

export async function addProjectLink(projectId: string, title: string, description: string, url: string) {
  const { data, error } = await supabase.rpc("create_team_project_resource", {
    _project_id: projectId,
    _title: nameSchema.parse(title),
    _description: z.string().trim().max(1000).parse(description),
    _resource_type: "link",
    _resource_url: normalizeTeamResourceUrl(url),
    _storage_path: null,
  });
  return requireData(data, error);
}

export async function uploadProjectAttachment(input: {
  teamId: string;
  projectId: string;
  userId: string;
  file: File;
  title: string;
  description: string;
}) {
  if (input.file.size < 1 || input.file.size > attachmentLimitBytes) {
    throw new Error("Attachments must be between 1 byte and 10 MB.");
  }
  if (!attachmentMimeTypes.has(input.file.type)) {
    throw new Error("Use a JPG, PNG, WebP, PDF, or plain-text attachment.");
  }
  const path = createTeamAttachmentPath(
    input.teamId,
    input.projectId,
    input.userId,
    crypto.randomUUID(),
    input.file.name,
  );
  const { error: uploadError } = await supabase.storage
    .from("team-attachments")
    .upload(path, input.file, { upsert: false, contentType: input.file.type });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.rpc("create_team_project_resource", {
    _project_id: input.projectId,
    _title: nameSchema.parse(input.title),
    _description: z.string().trim().max(1000).parse(input.description),
    _resource_type: "attachment",
    _resource_url: null,
    _storage_path: path,
  });
  if (error) {
    const { error: cleanupError } = await supabase.storage.from("team-attachments").remove([path]);
    if (cleanupError) {
      console.error("Could not remove unreferenced team attachment", cleanupError.message);
    }
    throw error;
  }
  return requireData(data, error);
}

export async function submitContribution(input: {
  taskId: string;
  summary: string;
  evidence: string;
  studyFlowItemId: string | null;
}) {
  const { data, error } = await supabase.rpc("submit_team_project_contribution", {
    _task_id: input.taskId,
    _summary: z.string().trim().min(1).max(1000).parse(input.summary),
    _evidence: z.string().trim().min(1).max(4000).parse(input.evidence),
    _studyflow_item_id: input.studyFlowItemId,
  });
  return requireData(data, error);
}

export async function getProjectAttachmentUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("team-attachments")
    .createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
