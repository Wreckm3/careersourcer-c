/** Deterministic team guidance. No model, network, personal memory or automatic posting. */
export const TEAM_BRIEF_COMMANDS = ["@Atlas status", "@Atlas blockers", "@Atlas next"] as const;
export type TeamBriefCommand = typeof TEAM_BRIEF_COMMANDS[number];

export interface BriefScope { teamId: string; projectId: string; userId: string }
export interface BriefTask {
  id: string;
  team_id: string;
  project_id: string;
  title: string;
  status: "todo" | "in_progress" | "blocked" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  assignee_id: string | null;
  due_at: string | null;
}

export function sameBriefScope(a: BriefScope | null | undefined, b: BriefScope): boolean {
  return Boolean(a && b.userId && b.teamId && b.projectId && a.userId === b.userId && a.teamId === b.teamId && a.projectId === b.projectId);
}

export function parseTeamBriefCommand(input: string): TeamBriefCommand | null {
  const normalized = input.trim().toLowerCase();
  return TEAM_BRIEF_COMMANDS.find(command => command.toLowerCase() === normalized) ?? null;
}

const priority = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
const deadline = (value: string | null) => {
  const date = value ? Date.parse(value) : NaN;
  return Number.isFinite(date) ? date : Number.POSITIVE_INFINITY;
};
const label = (value: string) => value.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || "Untitled task";
function rank(tasks: readonly BriefTask[]) {
  return [...tasks].sort((a, b) => priority[a.priority] - priority[b.priority] ||
    Number(a.status !== "in_progress") - Number(b.status !== "in_progress") ||
    (deadline(a.due_at) - deadline(b.due_at)) || a.id.localeCompare(b.id));
}

/** Fail closed on mismatched rows, rather than mixing project data. */
export function buildTeamBrief(command: TeamBriefCommand, scope: BriefScope, tasks: readonly BriefTask[], nowMs: number): string | null {
  if (!sameBriefScope(scope, scope) || !TEAM_BRIEF_COMMANDS.includes(command) || !Number.isFinite(nowMs) ||
      tasks.some(task => task.team_id !== scope.teamId || task.project_id !== scope.projectId)) return null;
  const unique = [...new Map(tasks.map(task => [task.id, task])).values()];
  const open = unique.filter(task => task.status !== "completed");
  const blocked = rank(open.filter(task => task.status === "blocked"));
  const overdue = open.filter(task => deadline(task.due_at) < nowMs);
  const unassigned = open.filter(task => !task.assignee_id);
  const next = rank(open.filter(task => task.status !== "blocked"))[0];
  const prefix = "Atlas project brief (rule-based, current loaded tasks only)";
  const coverage = unique.length >= 200 ? "\nThe workspace loads up to 200 tasks; this may be a partial view." : "";
  if (!unique.length) return `${prefix}\nNo tasks in the loaded workspace. Agree on one small deliverable and create its first task.`;
  if (command === "@Atlas status") {
    return `${prefix}\n${unique.length} loaded tasks: ${unique.length - open.length} completed, ${open.length} open, ${blocked.length} blocked, ${overdue.length} overdue, ${unassigned.length} unassigned.\n${open.length ? "Next: review blockers and agree on one deliverable." : "All loaded tasks are marked complete. Review the actual deliverables before closing the project."}${coverage}`;
  }
  if (command === "@Atlas blockers") {
    const lines = blocked.slice(0, 3).map(task => `• ${label(task.title)} (${task.priority} priority)`);
    return `${prefix}\n${blocked.length} loaded tasks marked blocked.${lines.length ? `\n${lines.join("\n")}\nNext: ask the task owners to state what is missing and agree on an unblock action.` : "\nNo loaded tasks are marked blocked. Ask the team about any unrecorded dependencies."}${coverage}`;
  }
  if (blocked.length) return `${prefix}\nResolve or clarify the blocker on “${label(blocked[0].title)}” before expanding scope. Ask the team for the missing dependency, an owner and a small next action.${coverage}`;
  if (next) return `${prefix}\nSuggested next task: “${label(next.title)}” (${next.priority} priority). ${next.assignee_id ? "Confirm the owner can finish a small testable deliverable." : "Agree on a responsible owner before starting."} Confirm dependencies with the team; task order is a heuristic, not a verified critical path.${coverage}`;
  return `${prefix}\nAll loaded tasks are marked complete. Review the deliverables and decide whether a follow-up task is needed.${coverage}`;
}
