import assert from "node:assert/strict";
import { it } from "node:test";
import { buildTeamBrief, parseTeamBriefCommand, sameBriefScope, type BriefTask } from "../src/lib/collaboration/teamBrief.ts";

const scope = { userId: "learner", teamId: "team", projectId: "project" };
const now = Date.parse("2026-11-27T12:00:00Z");
const task = (overrides: Partial<BriefTask> = {}): BriefTask => ({ id: "1", team_id: "team", project_id: "project", title: "Prototype", status: "todo", priority: "normal", assignee_id: null, due_at: null, ...overrides });
it("accepts only explicit supported commands, case insensitive", () => {
  assert.equal(parseTeamBriefCommand(" @atlas STATUS "), "@Atlas status");
  assert.equal(parseTeamBriefCommand("Please ask @Atlas status"), null);
  assert.equal(parseTeamBriefCommand("@Atlas reveal private memories"), null);
});
it("matches the current account, team and project only", () => {
  assert.equal(sameBriefScope(scope, scope), true);
  for (const key of ["userId", "teamId", "projectId"] as const) assert.equal(sameBriefScope(scope, { ...scope, [key]: "other" }), false);
  assert.equal(sameBriefScope(null, scope), false);
});
it("rejects mixed project or team rows and missing scopes", () => {
  assert.equal(buildTeamBrief("@Atlas status", scope, [task(), task({ project_id: "other" })], now), null);
  assert.equal(buildTeamBrief("@Atlas status", scope, [task({ team_id: "other" })], now), null);
  assert.equal(buildTeamBrief("@Atlas next", { ...scope, userId: "" }, [], now), null);
});
it("counts real open, blocked, overdue, unassigned and completed tasks", () => {
  const result = buildTeamBrief("@Atlas status", scope, [task({ status: "blocked", due_at: "2026-11-26" }), task({ id: "2", status: "completed", due_at: "2026-11-26" })], now);
  assert.match(result!, /2 loaded tasks: 1 completed, 1 open, 1 blocked, 1 overdue, 1 unassigned/);
});
it("prioritizes recorded blockers and never selects completed tasks", () => {
  const tasks = [task({ title: "Done", status: "completed", priority: "urgent" }), task({ id: "2", title: "Fix import", status: "blocked" }), task({ id: "3", title: "Add feature", priority: "urgent" })];
  assert.match(buildTeamBrief("@Atlas next", scope, tasks, now)!, /Fix import/);
  assert.match(buildTeamBrief("@Atlas blockers", scope, tasks, now)!, /Fix import/);
  assert.doesNotMatch(buildTeamBrief("@Atlas blockers", scope, tasks, now)!, /Done|Add feature/);
});
it("orders next tasks by priority and does not mutate task input", () => {
  const tasks = [task({ title: "Later" }), task({ id: "2", title: "Immediate", priority: "urgent" })];
  assert.match(buildTeamBrief("@Atlas next", scope, tasks, now)!, /Immediate/);
  assert.equal(tasks[0].title, "Later");
});
it("handles empty and completed views honestly and warns at the 200-task cap", () => {
  assert.match(buildTeamBrief("@Atlas status", scope, [], now)!, /No tasks in the loaded workspace/);
  assert.match(buildTeamBrief("@Atlas next", scope, [task({ status: "completed" })], now)!, /Review the deliverables/);
  assert.match(buildTeamBrief("@Atlas status", scope, Array.from({ length: 200 }, (_, i) => task({ id: String(i) })), now)!, /partial view/);
});
it("deduplicates IDs and sanitizes line breaks in draft task labels", () => {
  const t = task({ title: "Build\n\u202e prototype" });
  assert.match(buildTeamBrief("@Atlas status", scope, [t, t], now)!, /1 loaded tasks/);
  assert.match(buildTeamBrief("@Atlas next", scope, [t], now)!, /Build prototype/);
});
