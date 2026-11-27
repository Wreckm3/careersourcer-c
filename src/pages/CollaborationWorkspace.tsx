import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, FileUp, LoaderCircle, MessageSquare, Plus, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { supabase } from "@/integrations/supabase/client";
import { loadAtlasStudyFlow } from "@/lib/atlas/studyFlow";
import {
  addProjectLink,
  claimProjectTask,
  createProjectMilestone,
  createProjectTask,
  createTeam,
  createTeamProject,
  getProjectAttachmentUrl,
  inviteToTeam,
  loadTeamHome,
  loadTeamProjectWorkspace,
  loadTeamWorkspace,
  sendProjectMessage,
  setProjectTaskStatus,
  setTeamContributionPortfolioConsent,
  submitContribution,
  updateProjectMilestone,
  updateTeamProject,
  uploadProjectAttachment,
  type CollaborationTeam,
  type TeamMember,
  type TeamProject,
  type TeamProjectContribution,
  type TeamProjectMilestone,
  type TeamProjectResource,
  type TeamProjectTask,
  type TeamProjectTaskPriority,
} from "@/lib/collaboration/workspaces";
import { streamAtlasTeamRecommendation } from "@/lib/atlas/atlasTransport";

type TeamHome = Awaited<ReturnType<typeof loadTeamHome>>;
type TeamWorkspaceData = Awaited<ReturnType<typeof loadTeamWorkspace>>;
type ProjectWorkspaceData = Awaited<ReturnType<typeof loadTeamProjectWorkspace>>;
type StudyFlowData = Awaited<ReturnType<typeof loadAtlasStudyFlow>>;

const fieldClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";
const cardClass = "rounded-2xl border border-border bg-card p-5";

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function dateInputValue(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}

export default function CollaborationWorkspace() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { progress } = useProgress();
  const [home, setHome] = useState<TeamHome | null>(null);
  const [teamData, setTeamData] = useState<TeamWorkspaceData | null>(null);
  const [projectData, setProjectData] = useState<ProjectWorkspaceData | null>(null);
  const [studyFlow, setStudyFlow] = useState<StudyFlowData | null>(null);
  const [teamId, setTeamId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [teamName, setTeamName] = useState("");
  const [teamDiscoverable, setTeamDiscoverable] = useState(true);
  const [projectDraft, setProjectDraft] = useState({ name: "", description: "", objectives: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [atlasAnswer, setAtlasAnswer] = useState("");
  const [atlasLoading, setAtlasLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, navigate, user]);

  useEffect(() => {
    let active = true;
    if (revision === 0) setLoading(true);
    if (!user) return () => { active = false; };
    void loadTeamHome(user.id, user.email ?? null).then((data) => {
      if (!active) return;
      setHome(data);
      setTeamId((current) => current && data.memberships.some((membership) => membership.team_id === current)
        ? current
        : data.memberships[0]?.team_id ?? "");
    }).catch((error: unknown) => {
      if (active) toast.error(`Could not load collaboration: ${errorText(error)}`);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [revision, user]);

  const teamMembership = useMemo(
    () => home?.memberships.find((membership) => membership.team_id === teamId) ?? null,
    [home, teamId],
  );

  useEffect(() => {
    let active = true;
    setTeamData(null);
    setProjectData(null);
    setProjectId("");
    if (!teamId || !teamMembership) return () => { active = false; };
    void loadTeamWorkspace(teamId).then((data) => {
      if (!active) return;
      setTeamData(data);
      setProjectId((current) => data.projects.some((project) => project.id === current)
        ? current
        : data.projects[0]?.id ?? "");
    }).catch((error: unknown) => {
      if (active) toast.error(`Could not load team workspace: ${errorText(error)}`);
    });
    return () => { active = false; };
  }, [revision, teamId, teamMembership]);

  useEffect(() => {
    let active = true;
    setProjectData(null);
    if (!user || !teamId || !projectId || !teamMembership) return () => { active = false; };
    void loadTeamProjectWorkspace(teamId, projectId, user.id).then((data) => {
      if (!active) return;
      setProjectData(data);
    }).catch((error: unknown) => {
      if (active) toast.error(`Could not load project: ${errorText(error)}`);
    });
    return () => { active = false; };
  }, [revision, projectId, teamId, teamMembership, user]);

  useEffect(() => {
    let active = true;
    setStudyFlow(null);
    if (!user || !progress.selectedPath) return () => { active = false; };
    void loadAtlasStudyFlow(user.id, progress.selectedPath).then((data) => {
      if (active) setStudyFlow(data);
    }).catch((error: unknown) => {
      if (active) toast.error(`Could not load your StudyFlow objectives: ${errorText(error)}`);
    });
    return () => { active = false; };
  }, [progress.selectedPath, user]);

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      setRevision((value) => value + 1);
      return true;
    } catch (error) {
      toast.error(errorText(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitForm = (handler: () => Promise<unknown>, success: string) =>
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void runAction(handler, success);
    };

  const activeTeam = teamData?.team ?? null;
  const project = teamData?.projects.find((item) => item.id === projectId) ?? null;
  const manager = teamMembership?.role === "owner" || teamMembership?.role === "admin";
  const owner = teamMembership?.role === "owner";
  const currentUserId = user?.id ?? "";
  const roadmapOptions = studyFlow?.flow?.status === "active" && studyFlow.flow.active_roadmap
    ? studyFlow.flow.active_roadmap.objectives.flatMap((objective) =>
      objective.stages.flatMap((stage) => stage.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title }))))
    : [];
  const teamById = new Map((home?.teams ?? []).map((team) => [team.id, team]));
  const invitationTeamName = (invitation: TeamHome["invitations"][number]) =>
    teamById.get(invitation.team_id)?.name ?? "Invited team";

  const acceptInvitation = (invitationId: string) => runAction(async () => {
    const { data, error } = await supabase.rpc("accept_team_invitation", { _invitation_id: invitationId });
    if (error) throw error;
    if (!data) throw new Error("This invitation has expired. Ask the team manager for a new one.");
  }, "Invitation accepted");
  const declineInvitation = (invitationId: string) => runAction(async () => {
    const { error } = await supabase.rpc("decline_team_invitation", { _invitation_id: invitationId });
    if (error) throw error;
  }, "Invitation declined");
  const requestMembership = (team: CollaborationTeam) => runAction(async () => {
    const { error } = await supabase.rpc("request_to_join_team", { _team_id: team.id });
    if (error) throw error;
  }, "Join request sent");
  const withdrawRequest = (requestId: string) => runAction(async () => {
    const { error } = await supabase.rpc("withdraw_team_join_request", { _request_id: requestId });
    if (error) throw error;
  }, "Join request withdrawn");
  const approveJoin = (requestId: string) => runAction(async () => {
    const { error } = await supabase.rpc("approve_team_join_request", { _request_id: requestId });
    if (error) throw error;
  }, "Member added");
  const declineJoin = (requestId: string) => runAction(async () => {
    const { error } = await supabase.rpc("decline_team_join_request", { _request_id: requestId });
    if (error) throw error;
  }, "Join request declined");
  const changeRole = (member: TeamMember, role: "admin" | "member") => runAction(async () => {
    const { error } = await supabase.rpc("set_team_member_role", {
      _team_id: teamId,
      _member_id: member.user_id,
      _role: role,
    });
    if (error) throw error;
  }, "Member role updated");
  const removeMember = (member: TeamMember) => runAction(async () => {
    const { error } = await supabase.rpc("remove_team_member", { _team_id: teamId, _member_id: member.user_id });
    if (error) throw error;
  }, "Team access removed");

  const atlasRecommendation = async (task: TeamProjectTask) => {
    setAtlasLoading(true);
    setAtlasAnswer("");
    try {
      const { answer } = await streamAtlasTeamRecommendation(task.id, () => undefined);
      setAtlasAnswer(answer);
    } catch (error) {
      toast.error(`Atlas could not make a recommendation: ${errorText(error)}`);
    } finally {
      setAtlasLoading(false);
    }
  };
  const ProjectWorkspaceView = useMemo(() => ProjectWorkspace, []);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><LoaderCircle className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!user) return null;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/pool" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Collaboration Pool
            </Link>
            <h1 className="text-3xl font-black tracking-tight">Team workspaces</h1>
            <p className="mt-1 text-sm text-muted-foreground">Build together, keep responsibilities clear, and carry verified work into your own portfolio.</p>
          </div>
          <Link to="/atlas" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Open Atlas</Link>
        </div>

        {!!home?.invitations.length && (
          <section className={`${cardClass} mb-6`} aria-label="Team invitations">
            <h2 className="mb-3 font-bold">Invitations</h2>
            <div className="space-y-3">
              {home.invitations.map((invitation) => (
                <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-3">
                  <span className="text-sm">{invitationTeamName(invitation)}</span>
                  <div className="flex gap-2">
                    <button disabled={busy} onClick={() => void acceptInvitation(invitation.id)} className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">Accept</button>
                    <button disabled={busy} onClick={() => void declineInvitation(invitation.id)} className="rounded-lg border border-border px-3 py-1.5 text-sm">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className={cardClass}>
              <h2 className="mb-3 flex items-center gap-2 font-bold"><Plus className="h-4 w-4" /> Create a team</h2>
              <form onSubmit={submitForm(async () => {
                const id = await createTeam(teamName, teamDiscoverable);
                setTeamName("");
                setTeamId(id);
              }, "Team created")} className="space-y-3">
                <input className={fieldClass} value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Team name" maxLength={80} required />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={teamDiscoverable} onChange={(event) => setTeamDiscoverable(event.target.checked)} />
                  Show in team discovery
                </label>
                <button disabled={busy} className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Create team</button>
              </form>
            </section>
            <section className={cardClass}>
              <h2 className="mb-3 flex items-center gap-2 font-bold"><Users className="h-4 w-4" /> Your teams</h2>
              {!home?.memberships.length && <p className="text-sm text-muted-foreground">You are not in a team yet. Create one or request to join a discoverable team.</p>}
              <div className="space-y-2">
                {home?.memberships.map((membership) => {
                  const team = teamById.get(membership.team_id);
                  return (
                    <button key={membership.team_id} onClick={() => setTeamId(membership.team_id)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${teamId === membership.team_id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                      <span className="block font-semibold">{team?.name ?? "Team"}</span>
                      <span className="text-xs capitalize text-muted-foreground">{membership.role}</span>
                    </button>
                  );
                })}
              </div>
            </section>
            <section className={cardClass}>
              <h2 className="mb-3 font-bold">Discover teams</h2>
              <div className="space-y-3">
                {home?.discoverableTeams.filter((team) => !home.memberships.some((member) => member.team_id === team.id)).map((team) => {
                  const pending = home.joinRequests.find((request) => request.team_id === team.id);
                  return (
                    <div key={team.id} className="rounded-xl border border-border p-3">
                      <p className="font-semibold">{team.name}</p>
                      <p className="my-2 text-xs text-muted-foreground">A CareerSourcer learning team.</p>
                      {pending
                        ? <button disabled={busy} onClick={() => void withdrawRequest(pending.id)} className="text-xs font-semibold text-primary">Withdraw request</button>
                        : <button disabled={busy} onClick={() => void requestMembership(team)} className="text-xs font-semibold text-primary">Request to join</button>}
                    </div>
                  );
                })}
                {!home?.discoverableTeams.length && <p className="text-sm text-muted-foreground">No discoverable teams are available right now.</p>}
              </div>
            </section>
          </aside>

          <div className="space-y-6">
            {!activeTeam || !teamMembership ? (
              <section className={cardClass}>
                <h2 className="text-xl font-bold">Your workspace starts here</h2>
                <p className="mt-2 text-sm text-muted-foreground">Team projects are available to every signed-in learner. Pick a team from the left or create one to get started.</p>
              </section>
            ) : (
              <>
                <section className={cardClass}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{teamMembership.role} workspace</p>
                      <h2 className="mt-1 text-2xl font-bold">{activeTeam.name}</h2>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">A shared place for projects, tasks, and learning.</p>
                    </div>
                    <button disabled={busy} onClick={() => void runAction(async () => {
                      const { error } = await supabase.rpc("leave_team", { _team_id: teamId });
                      if (error) throw error;
                      setTeamId("");
                    }, "You left the team")} className="rounded-lg border border-border px-3 py-2 text-sm">Leave team</button>
                  </div>
                  {manager && (
                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <form onSubmit={submitForm(async () => {
                        await inviteToTeam(teamId, inviteEmail);
                        setInviteEmail("");
                      }, "Invitation created")} className="flex gap-2">
                        <input className={fieldClass} type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Invite by email" required />
                        <button disabled={busy} className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Invite</button>
                      </form>
                      {owner && <select aria-label="Transfer ownership" className={fieldClass} defaultValue="" onChange={(event) => {
                        const newOwner = event.target.value;
                        if (!newOwner) return;
                        void runAction(async () => {
                          const { error } = await supabase.rpc("transfer_team_ownership", { _team_id: teamId, _new_owner_id: newOwner });
                          if (error) throw error;
                        }, "Ownership transferred");
                      }}>
                        <option value="">Transfer ownership…</option>
                        {teamData?.members.filter((member) => member.user_id !== teamMembership.user_id).map((member) => <option key={member.user_id} value={member.user_id}>{member.user_id.slice(0, 8)}… ({member.role})</option>)}
                      </select>}
                    </div>
                  )}
                  {manager && <form onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    void runAction(async () => {
                      const { error } = await supabase.rpc("update_team", {
                        _team_id: teamId,
                        _name: String(formData.get("team-name") ?? ""),
                        _is_discoverable: formData.get("discoverable") === "on",
                      });
                      if (error) throw error;
                    }, "Team settings updated");
                  }} className="mt-5 grid gap-2 rounded-xl bg-muted/30 p-3 md:grid-cols-[1fr_auto_auto]">
                    <input className={fieldClass} name="team-name" defaultValue={activeTeam.name} maxLength={80} required />
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input name="discoverable" type="checkbox" defaultChecked={activeTeam.is_discoverable} />
                      Discoverable
                    </label>
                    <button disabled={busy} className="rounded-lg border border-border px-3 py-2 text-sm">Save team settings</button>
                  </form>}
                  {!!teamData?.joinRequests.length && manager && (
                    <div className="mt-5 border-t border-border pt-4">
                      <h3 className="mb-2 text-sm font-bold">Join requests</h3>
                      <div className="space-y-2">
                        {teamData.joinRequests.map((request) => (
                          <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                            <span>Learner {request.requester_id.slice(0, 8)}…</span>
                            <div className="flex gap-2">
                              <button disabled={busy} onClick={() => void approveJoin(request.id)} className="font-semibold text-primary">Approve</button>
                              <button disabled={busy} onClick={() => void declineJoin(request.id)} className="text-muted-foreground">Decline</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!!teamData?.invitations.length && manager && (
                    <div className="mt-5 border-t border-border pt-4">
                      <h3 className="mb-2 text-sm font-bold">Pending invitations</h3>
                      <div className="space-y-2">
                        {teamData.invitations.map((invitation) => (
                          <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                            <span>{invitation.invitee_email || "Invited learner"}</span>
                            <button disabled={busy} onClick={() => void runAction(async () => {
                              const { error } = await supabase.rpc("revoke_team_invitation", { _invitation_id: invitation.id });
                              if (error) throw error;
                            }, "Invitation revoked")} className="text-xs font-semibold text-destructive">Revoke</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-5 border-t border-border pt-4">
                    <h3 className="mb-2 text-sm font-bold">Active members ({teamData?.members.length ?? 0}/25)</h3>
                    <div className="space-y-2">
                      {teamData?.members.map((member) => (
                        <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm">
                          <span>Learner {member.user_id.slice(0, 8)}… <span className="capitalize text-muted-foreground">· {member.role}</span></span>
                          {member.user_id !== currentUserId && (
                            <div className="flex items-center gap-2">
                              {owner && member.role !== "owner" && <select aria-label={`Role for ${member.user_id.slice(0, 8)}`} className="rounded-md border border-border bg-background px-2 py-1 text-xs" value={member.role} onChange={(event) => void changeRole(member, event.target.value as "admin" | "member")}>
                                <option value="member">Member</option><option value="admin">Admin</option>
                              </select>}
                              {manager && (owner || member.role === "member") && <button disabled={busy} onClick={() => void removeMember(member)} className="text-xs text-destructive">Remove</button>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className={cardClass}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">Projects</h2>
                      <p className="text-sm text-muted-foreground">Share objectives, milestones, tasks, resources and verified contributions.</p>
                    </div>
                    <select className={`${fieldClass} max-w-xs`} aria-label="Select team project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                      <option value="">Select a project</option>
                      {teamData?.projects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                  {manager && <form onSubmit={submitForm(async () => {
                    const id = await createTeamProject(teamId, projectDraft.name, projectDraft.description, projectDraft.objectives);
                    setProjectDraft({ name: "", description: "", objectives: "" });
                    setProjectId(id);
                  }, "Project created")} className="mb-5 grid gap-2 rounded-xl bg-muted/30 p-4 md:grid-cols-2">
                    <input className={fieldClass} placeholder="Project name" value={projectDraft.name} onChange={(event) => setProjectDraft({ ...projectDraft, name: event.target.value })} required />
                    <input className={fieldClass} placeholder="Objectives" value={projectDraft.objectives} onChange={(event) => setProjectDraft({ ...projectDraft, objectives: event.target.value })} />
                    <textarea className={`${fieldClass} md:col-span-2`} placeholder="Description" value={projectDraft.description} onChange={(event) => setProjectDraft({ ...projectDraft, description: event.target.value })} rows={2} />
                    <button disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground md:col-span-2">Create project</button>
                  </form>}
                  {!project && <p className="text-sm text-muted-foreground">{teamData?.projects.length ? "Select a project to view its workspace." : "This team has no projects yet."}</p>}
                  {project && projectData && (
                    <ProjectWorkspaceView
                      key={project.id}
                      project={project}
                      teamMembers={teamData?.members ?? []}
                      manager={manager}
                      userId={currentUserId}
                      data={projectData}
                      roadmapOptions={roadmapOptions}
                      busy={busy}
                      atlasAnswer={atlasAnswer}
                      atlasLoading={atlasLoading}
                      onAtlasRecommendation={atlasRecommendation}
                      onAction={runAction}
                      onSendMessage={(body) => sendProjectMessage(project.id, body)}
                      onCreateTask={(input) => createProjectTask({ projectId: project.id, ...input })}
                      onCreateMilestone={(input) => createProjectMilestone({ projectId: project.id, ...input })}
                      onUpdateMilestone={updateProjectMilestone}
                      onSetTaskStatus={setProjectTaskStatus}
                      onClaimTask={claimProjectTask}
                      onSubmitContribution={submitContribution}
                      onReviewContribution={async (contributionId, approve, notes) => {
                        const { error } = await supabase.rpc("review_team_project_contribution", {
                          _contribution_id: contributionId,
                          _approve: approve,
                          _review_notes: notes,
                        });
                        if (error) throw error;
                      }}
                      onPortfolioConsent={setTeamContributionPortfolioConsent}
                      onUpdateProject={updateTeamProject}
                      onAddLink={(title, description, url) => addProjectLink(project.id, title, description, url)}
                      onUpload={(file, title, description) => uploadProjectAttachment({
                        teamId,
                        projectId: project.id,
                        userId: currentUserId,
                        file,
                        title,
                        description,
                      })}
                      onOpenAttachment={(resource) => {
                        const path = resource.storage_path;
                        if (!path) return;
                        const tab = window.open("about:blank", "_blank");
                        if (!tab) {
                          toast.error("Allow pop-ups to open the attachment.");
                          return;
                        }
                        tab.opener = null;
                        void getProjectAttachmentUrl(path).then((url) => {
                          if (!tab.closed) tab.location.replace(url);
                        }).catch((error: unknown) => {
                          tab.close();
                          toast.error(`Could not open attachment: ${errorText(error)}`);
                        });
                      }}
                    />
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );

  function ProjectWorkspace(props: {
    project: TeamProject;
    teamMembers: TeamMember[];
    manager: boolean;
    userId: string;
    data: ProjectWorkspaceData;
    roadmapOptions: { id: string; title: string }[];
    busy: boolean;
    atlasAnswer: string;
    atlasLoading: boolean;
    onAtlasRecommendation: (task: TeamProjectTask) => Promise<void>;
    onAction: (action: () => Promise<unknown>, success: string) => Promise<boolean>;
    onSendMessage: (body: string) => Promise<unknown>;
    onCreateTask: (input: { title: string; description: string; assigneeId: string | null; dueAt: string | null; priority: TeamProjectTaskPriority }) => Promise<unknown>;
    onCreateMilestone: (input: { title: string; description: string; dueAt: string | null }) => Promise<unknown>;
    onUpdateMilestone: typeof updateProjectMilestone;
    onUpdateProject: typeof updateTeamProject;
    onSetTaskStatus: typeof setProjectTaskStatus;
    onClaimTask: (taskId: string) => Promise<void>;
    onSubmitContribution: (input: { taskId: string; summary: string; evidence: string; studyFlowItemId: string | null }) => Promise<unknown>;
    onReviewContribution: (contributionId: string, approve: boolean, notes: string) => Promise<void>;
    onPortfolioConsent: (contributionId: string, consent: boolean) => Promise<void>;
    onAddLink: (title: string, description: string, url: string) => Promise<unknown>;
    onUpload: (file: File, title: string, description: string) => Promise<unknown>;
    onOpenAttachment: (resource: TeamProjectResource) => void;
  }) {
    const [message, setMessage] = useState("");
    const [task, setTask] = useState<{ title: string; description: string; assigneeId: string; dueDate: string; priority: TeamProjectTaskPriority }>({ title: "", description: "", assigneeId: "", dueDate: "", priority: "normal" });
    const [milestone, setMilestone] = useState({ title: "", description: "", dueDate: "" });
    const [link, setLink] = useState({ title: "", description: "", url: "" });
    const [attachment, setAttachment] = useState({ title: "", description: "" });
    const [evidence, setEvidence] = useState<Record<string, { summary: string; text: string; itemId: string }>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const handleActionForm = (action: () => Promise<unknown>, success: string) =>
      (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void props.onAction(action, success);
      };

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">{props.project.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{props.project.description || "No description yet."}</p>
              {props.project.objectives && <p className="mt-2 text-sm"><span className="font-semibold">Objectives:</span> {props.project.objectives}</p>}
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">{props.project.status.replace("_", " ")}</span>
          </div>
          {props.manager && <select className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm" aria-label="Project status" value={props.project.status} onChange={(event) => void props.onAction(() => props.onUpdateProject({
            projectId: props.project.id,
            name: props.project.name,
            description: props.project.description,
            objectives: props.project.objectives,
            status: event.target.value as typeof props.project.status,
          }), "Project status updated")}>
            {["planning", "active", "on_hold", "completed", "archived"].map((status) => <option value={status} key={status}>{status.replace("_", " ")}</option>)}
          </select>}
        </div>

        <section>
          <h3 className="mb-3 font-bold">Tasks & responsibilities</h3>
          {props.manager && <form onSubmit={handleActionForm(() => props.onCreateTask({
            title: task.title,
            description: task.description,
            assigneeId: task.assigneeId || null,
            dueAt: dateInputValue(task.dueDate),
            priority: task.priority,
          }).then((result) => {
            setTask({ title: "", description: "", assigneeId: "", dueDate: "", priority: "normal" });
            return result;
          }), "Task created")} className="mb-4 grid gap-2 rounded-xl bg-muted/30 p-4 md:grid-cols-2">
            <input className={fieldClass} placeholder="Task title" value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} required />
            <select className={fieldClass} aria-label="Assign task" value={task.assigneeId} onChange={(event) => setTask({ ...task, assigneeId: event.target.value })}>
              <option value="">Unassigned</option>
              {props.teamMembers.map((member) => <option key={member.user_id} value={member.user_id}>{member.user_id.slice(0, 8)}…</option>)}
            </select>
            <input className={fieldClass} type="date" value={task.dueDate} onChange={(event) => setTask({ ...task, dueDate: event.target.value })} />
            <select className={fieldClass} value={task.priority} onChange={(event) => setTask({ ...task, priority: event.target.value as typeof task.priority })}>
              {["low", "normal", "high", "urgent"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
            <textarea className={`${fieldClass} md:col-span-2`} placeholder="Task description" rows={2} value={task.description} onChange={(event) => setTask({ ...task, description: event.target.value })} />
            <button disabled={props.busy} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground md:col-span-2">Create task</button>
          </form>}
          <div className="space-y-3">
            {props.data.tasks.map((item) => {
              const isAssigned = item.assignee_id === props.userId;
              const ownDraft = evidence[item.id] ?? { summary: "", text: "", itemId: "" };
              return (
                <article key={item.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold">{item.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description || "No task details."}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Assigned to {item.assignee_id ? `${item.assignee_id.slice(0, 8)}…` : "no one"} · {item.priority} priority{item.due_at ? ` · Due ${new Date(item.due_at).toLocaleDateString()}` : ""}</p>
                    </div>
                    <select className="rounded-lg border border-border bg-background px-2 py-1 text-xs" value={item.status} disabled={props.busy || (!props.manager && !isAssigned)} aria-label={`Status for ${item.title}`} onChange={(event) => void props.onAction(() => props.onSetTaskStatus(item.id, event.target.value as TeamProjectTask["status"]), "Task updated")}>
                      {["todo", "in_progress", "blocked", "completed"].map((status) => <option value={status} key={status}>{status.replace("_", " ")}</option>)}
                    </select>
                  </div>
                  {!item.assignee_id && item.status !== "completed" && <button disabled={props.busy} onClick={() => void props.onAction(() => props.onClaimTask(item.id), "Task assigned to you")} className="mt-3 text-sm font-semibold text-primary">Take responsibility</button>}
                  {isAssigned && !props.data.contributions.some((contribution) =>
                    contribution.task_id === item.id && contribution.contributor_id === props.userId &&
                    (contribution.status === "pending" || contribution.status === "approved")) && (
                    <div className="mt-4 rounded-lg bg-muted/30 p-3">
                      <p className="mb-2 text-sm font-semibold">Submit your contribution for review</p>
                      <form onSubmit={handleActionForm(() => props.onSubmitContribution({
                        taskId: item.id,
                        summary: ownDraft.summary,
                        evidence: ownDraft.text,
                        studyFlowItemId: ownDraft.itemId || null,
                      }).then((result) => {
                        setEvidence((current) => ({ ...current, [item.id]: { summary: "", text: "", itemId: "" } }));
                        return result;
                      }), "Contribution submitted")} className="space-y-2">
                        <input className={fieldClass} placeholder="What did you contribute?" maxLength={1000} value={ownDraft.summary} onChange={(event) => setEvidence({ ...evidence, [item.id]: { ...ownDraft, summary: event.target.value } })} required />
                        <textarea className={fieldClass} placeholder="Describe or link the supporting evidence" maxLength={4000} rows={2} value={ownDraft.text} onChange={(event) => setEvidence({ ...evidence, [item.id]: { ...ownDraft, text: event.target.value } })} required />
                        <select className={fieldClass} aria-label="Link contribution to a StudyFlow lesson" value={ownDraft.itemId} onChange={(event) => setEvidence({ ...evidence, [item.id]: { ...ownDraft, itemId: event.target.value } })}>
                          <option value="">No StudyFlow link</option>
                          {props.roadmapOptions.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
                        </select>
                        <button disabled={props.busy} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Submit evidence</button>
                      </form>
                    </div>
                  )}
                  {isAssigned && <button disabled={props.atlasLoading} onClick={() => void props.onAtlasRecommendation(item)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary disabled:opacity-50">
                    {props.atlasLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />} Ask Atlas for a learning exercise
                  </button>}
                </article>
              );
            })}
            {!props.data.tasks.length && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
          </div>
          {!!props.atlasAnswer && <div className="mt-3 whitespace-pre-wrap rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">{props.atlasAnswer}</div>}
        </section>

        <section>
          <h3 className="mb-3 font-bold">Milestones</h3>
          {props.manager && <form onSubmit={handleActionForm(() => props.onCreateMilestone({
            title: milestone.title,
            description: milestone.description,
            dueAt: dateInputValue(milestone.dueDate),
          }).then((result) => {
            setMilestone({ title: "", description: "", dueDate: "" });
            return result;
          }), "Milestone created")} className="mb-3 grid gap-2 md:grid-cols-2">
            <input className={fieldClass} placeholder="Milestone" value={milestone.title} onChange={(event) => setMilestone({ ...milestone, title: event.target.value })} required />
            <input className={fieldClass} type="date" value={milestone.dueDate} onChange={(event) => setMilestone({ ...milestone, dueDate: event.target.value })} />
            <input className={`${fieldClass} md:col-span-2`} placeholder="Completion target" value={milestone.description} onChange={(event) => setMilestone({ ...milestone, description: event.target.value })} />
            <button disabled={props.busy} className="rounded-lg border border-border px-3 py-2 text-sm md:col-span-2">Add milestone</button>
          </form>}
          <div className="space-y-2">
            {props.data.milestones.map((item: TeamProjectMilestone) => <div key={item.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-semibold">{item.title}</p><p className="text-sm text-muted-foreground">{item.description || "No completion notes."}</p></div>
                {props.manager && <select className="rounded-lg border border-border bg-background px-2 py-1 text-xs" aria-label={`Status for milestone ${item.title}`} value={item.status} onChange={(event) => void props.onAction(() => props.onUpdateMilestone({
                  milestoneId: item.id,
                  title: item.title,
                  description: item.description,
                  dueAt: item.due_at,
                  status: event.target.value as TeamProjectMilestone["status"],
                }), "Milestone updated")}>
                  {["pending", "in_progress", "completed"].map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
                </select>}
              </div>
              {item.due_at && <p className="mt-1 text-xs text-muted-foreground">Target {new Date(item.due_at).toLocaleDateString()}</p>}
            </div>)}
            {!props.data.milestones.length && <p className="text-sm text-muted-foreground">No milestones yet.</p>}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-bold">Verified contributions</h3>
          <div className="space-y-3">
            {props.data.contributions.map((item: TeamProjectContribution) => (
              <article key={item.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.summary}</p>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{item.status}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.evidence}</p>
                {item.review_notes && <p className="mt-2 text-sm"><span className="font-semibold">Review:</span> {item.review_notes}</p>}
                {props.manager && item.status === "pending" && item.contributor_id !== props.userId && (
                  <div className="mt-3 space-y-2">
                    <input className={fieldClass} placeholder="Optional reviewer note" value={notes[item.id] ?? ""} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} />
                    <div className="flex gap-2">
                      <button disabled={props.busy} onClick={() => void props.onAction(() => props.onReviewContribution(item.id, true, notes[item.id] ?? ""), "Contribution approved")} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Approve</button>
                      <button disabled={props.busy} onClick={() => void props.onAction(() => props.onReviewContribution(item.id, false, notes[item.id] ?? ""), "Contribution disputed")} className="rounded-lg border border-border px-3 py-2 text-sm">Dispute</button>
                    </div>
                  </div>
                )}
                {item.contributor_id === props.userId && item.status === "approved" && (
                  <button disabled={props.busy} onClick={() => {
                    const consented = props.data.portfolio.some((entry) => entry.contribution_id === item.id);
                    void props.onAction(() => props.onPortfolioConsent(item.id, !consented), consented ? "Portfolio consent withdrawn" : "Contribution added to your portfolio");
                  }} className="mt-3 text-sm font-semibold text-primary">
                    {props.data.portfolio.some((entry) => entry.contribution_id === item.id) ? "Remove from my portfolio" : "Add to my portfolio"}
                  </button>
                )}
              </article>
            ))}
            {!props.data.contributions.length && <p className="text-sm text-muted-foreground">Approved evidence can be added to an individual portfolio only with the contributor’s consent.</p>}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-bold">Resources & files</h3>
          {props.manager && <form onSubmit={handleActionForm(() => props.onAddLink(link.title, link.description, link.url).then((result) => {
            setLink({ title: "", description: "", url: "" });
            return result;
          }), "Resource shared")} className="mb-3 grid gap-2 md:grid-cols-2">
            <input className={fieldClass} placeholder="Resource title" value={link.title} onChange={(event) => setLink({ ...link, title: event.target.value })} required />
            <input className={fieldClass} type="url" placeholder="https://…" value={link.url} onChange={(event) => setLink({ ...link, url: event.target.value })} required />
            <input className={`${fieldClass} md:col-span-2`} placeholder="Why this resource is useful" value={link.description} onChange={(event) => setLink({ ...link, description: event.target.value })} />
            <button disabled={props.busy} className="rounded-lg border border-border px-3 py-2 text-sm md:col-span-2">Share link</button>
          </form>}
          <form onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const file = (form.elements.namedItem("team-file") as HTMLInputElement).files?.[0];
            if (!file) return toast.error("Choose a file to upload.");
            void props.onAction(() => props.onUpload(file, attachment.title || file.name, attachment.description), "Attachment uploaded").then(() => {
              setAttachment({ title: "", description: "" });
              form.reset();
            });
          }} className="mb-3 grid gap-2 rounded-xl bg-muted/30 p-3 md:grid-cols-2">
            <input className={fieldClass} placeholder="Attachment title (optional)" value={attachment.title} onChange={(event) => setAttachment({ ...attachment, title: event.target.value })} />
            <input className={fieldClass} name="team-file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.txt" required />
            <input className={`${fieldClass} md:col-span-2`} placeholder="Description" value={attachment.description} onChange={(event) => setAttachment({ ...attachment, description: event.target.value })} />
            <button disabled={props.busy} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm md:col-span-2"><FileUp className="h-4 w-4" /> Upload private attachment (10 MB max)</button>
          </form>
          <div className="space-y-2">
            {props.data.resources.map((resource) => (
              <div key={resource.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div><p className="font-semibold">{resource.title}</p><p className="text-sm text-muted-foreground">{resource.description || resource.resource_type}</p></div>
                {resource.resource_type === "attachment"
                  ? <button onClick={() => props.onOpenAttachment(resource)} className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ExternalLink className="h-4 w-4" /> Open file</button>
                  : resource.resource_url && <a href={resource.resource_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ExternalLink className="h-4 w-4" /> Open link</a>}
              </div>
            ))}
            {!props.data.resources.length && <p className="text-sm text-muted-foreground">No resources shared.</p>}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-bold">Private team discussion</h3>
          <form onSubmit={handleActionForm(() => props.onSendMessage(message).then((result) => {
            setMessage("");
            return result;
          }), "Message sent")} className="mb-3 flex gap-2">
            <input className={fieldClass} maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share an update with this project team" required />
            <button disabled={props.busy} aria-label="Send message" className="shrink-0 rounded-lg bg-primary px-3 text-primary-foreground"><Send className="h-4 w-4" /></button>
          </form>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {props.data.messages.map((item) => <div key={item.id} className="rounded-lg bg-muted/30 p-3">
              <p className="whitespace-pre-wrap text-sm">{item.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">Learner {item.author_id.slice(0, 8)}… · {new Date(item.created_at).toLocaleString()}</p>
            </div>)}
            {!props.data.messages.length && <p className="text-sm text-muted-foreground">Start a discussion with your team.</p>}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-bold">Recent project activity</h3>
          <div className="space-y-2">
            {props.data.activity.map((item) => <div key={item.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <span className="font-semibold">{item.activity_type.replace(/_/g, " ")}</span>
              <span className="ml-2 text-xs text-muted-foreground">{item.actor_id ? `Learner ${item.actor_id.slice(0, 8)}… · ` : ""}{new Date(item.created_at).toLocaleString()}</span>
            </div>)}
            {!props.data.activity.length && <p className="text-sm text-muted-foreground">Project actions will appear here.</p>}
          </div>
        </section>
      </div>
    );
  }
}
