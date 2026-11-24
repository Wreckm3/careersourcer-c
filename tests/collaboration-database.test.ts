import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";

const localUrl = process.env.COLLAB_LOCAL_SUPABASE_URL;
const anonKey = process.env.COLLAB_LOCAL_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.COLLAB_LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(localUrl && anonKey && serviceRoleKey);

if (configured) {
  const hostname = new URL(localUrl!).hostname;
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)) {
    throw new Error("Collaboration database tests only run against a local Supabase URL.");
  }
} else if (localUrl || anonKey || serviceRoleKey) {
  throw new Error("Set all three COLLAB_LOCAL_SUPABASE_* variables to run database tests.");
}

const service = configured
  ? createClient<Database>(localUrl!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const createdUserIds: string[] = [];
const createdTeamIds: string[] = [];

after(async () => {
  if (!service) return;
  let cleanupError: string | null = null;
  if (createdTeamIds.length) {
    const { error } = await service.from("teams").delete().in("id", createdTeamIds);
    if (error) cleanupError = `Could not clean up local test teams: ${error.message}`;
  }
  for (const id of createdUserIds) {
    const { error } = await service.auth.admin.deleteUser(id);
    if (error && !cleanupError) {
      cleanupError = `Could not clean up local test user: ${error.message}`;
    }
  }
  if (cleanupError) throw new Error(cleanupError);
});

test(
  "collaboration membership limit, slot release, pending requests, and concurrent acceptance",
  { skip: configured ? false : "Local Supabase credentials are not configured." },
  async () => {
    assert.ok(service);
    const testRun = randomUUID();
    const password = `Local-Test-${randomUUID()}-aA1!`;
    const users: Array<{ id: string; client: SupabaseClient<Database> }> = [];

    for (let index = 0; index < 28; index += 1) {
      const email = `collab-${testRun}-${index}@example.test`;
      const { data, error } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) {
        throw new Error(`Could not create local test user: ${error?.message}`);
      }
      createdUserIds.push(data.user.id);

      const client = createClient<Database>(localUrl!, anonKey!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(`Could not sign in local test user: ${signInError.message}`);
      users.push({ id: data.user.id, client });
    }

    const owner = users[0].client;
    const fillers = users.slice(1, 24);
    const inviteeOne = users[24];
    const inviteeTwo = users[25];
    const requester = users[26];

    const requireData = <T>(data: T | null, error: { message: string } | null): T => {
      if (error || data == null) throw new Error(error?.message ?? "Expected Supabase response data.");
      return data;
    };

    const createTeam = async (client: SupabaseClient<Database>, name: string) => {
      const result = await client.rpc("create_team", {
        _name: name,
        _is_discoverable: false,
      });
      const teamId = requireData(result.data, result.error);
      createdTeamIds.push(teamId);
      return teamId;
    };

    const insertFillers = async (targetTeamId: string) => {
      const { error } = await service!.from("team_members").insert(
        fillers.map(({ id }) => ({
          team_id: targetTeamId,
          user_id: id,
          role: "member" as const,
          status: "active" as const,
        })),
      );
      if (error) throw new Error(`Could not prepare local fixture members: ${error.message}`);
    };

    const activeCount = async (targetTeamId: string) => {
      const { count, error } = await service!
        .from("team_members")
        .select("user_id", { count: "exact", head: true })
        .eq("team_id", targetTeamId)
        .eq("status", "active");
      if (error) throw new Error(`Could not count local team members: ${error.message}`);
      return count ?? 0;
    };

    const createInvitation = async (targetTeamId: string, inviteeId: string) => {
      const { data, error } = await owner.rpc("create_team_invitation", {
        _team_id: targetTeamId,
        _invitee_id: inviteeId,
      });
      return requireData(data, error);
    };

    const accept = (user: { client: SupabaseClient<Database> }, invitationId: string) =>
      user.client.rpc("accept_team_invitation", { _invitation_id: invitationId });

    try {
      const teamId = await createTeam(owner, `Capacity ${testRun}`);
      await insertFillers(teamId);
      assert.equal(await activeCount(teamId), 24, "owner must be included among 24 active members");

      const [invitationOne, invitationTwo] = await Promise.all([
        createInvitation(teamId, inviteeOne.id),
        createInvitation(teamId, inviteeTwo.id),
      ]);
      const { data: requestId, error: requestError } = await requester.client.rpc(
        "request_to_join_team",
        { _team_id: teamId },
      );
      assert.ifError(requestError);
      assert.ok(requestId);
      assert.equal(await activeCount(teamId), 24, "pending invitations and requests reserve no slots");

      const accepted = await accept(inviteeOne, invitationOne);
      assert.ifError(accepted.error);
      assert.equal(await activeCount(teamId), 25, "24 members can accept one more");

      const rejectedApproval = await owner.rpc("approve_team_join_request", {
        _request_id: requestId,
      });
      assert.match(rejectedApproval.error?.message ?? "", /TEAM_FULL/);
      const declined = await owner.rpc("decline_team_join_request", { _request_id: requestId });
      assert.ifError(declined.error);

      const rejectedInvitation = await accept(inviteeTwo, invitationTwo);
      assert.match(rejectedInvitation.error?.message ?? "", /TEAM_FULL/);
      const removed = await owner.rpc("remove_team_member", {
        _team_id: teamId,
        _member_id: fillers[fillers.length - 1].id,
      });
      assert.ifError(removed.error);
      assert.equal(await activeCount(teamId), 24, "removal frees one membership slot");

      const acceptedAfterRemoval = await accept(inviteeTwo, invitationTwo);
      assert.ifError(acceptedAfterRemoval.error);
      assert.equal(await activeCount(teamId), 25);

      const secondTeam = await createTeam(owner, `Concurrent ${testRun}`);
      await insertFillers(secondTeam);
      const concurrentInvitations = await Promise.all([
        owner.rpc("create_team_invitation", {
          _team_id: secondTeam,
          _invitee_id: inviteeOne.id,
        }),
        owner.rpc("create_team_invitation", { _team_id: secondTeam, _invitee_id: inviteeTwo.id }),
      ]);
      assert.ifError(concurrentInvitations[0].error);
      assert.ifError(concurrentInvitations[1].error);
      const race = await Promise.all([
        accept(inviteeOne, concurrentInvitations[0].data!),
        accept(inviteeTwo, concurrentInvitations[1].data!),
      ]);
      assert.equal(race.filter((result) => !result.error).length, 1);
      assert.equal(race.filter((result) => /TEAM_FULL/.test(result.error?.message ?? "")).length, 1);
      assert.equal(await activeCount(secondTeam), 25, "concurrent acceptances must never create member 26");

      const mixedRaceTeam = await createTeam(owner, `Mixed admission race ${testRun}`);
      await insertFillers(mixedRaceTeam);
      const mixedInvitation = await createInvitation(mixedRaceTeam, inviteeOne.id);
      const { data: mixedRequestId, error: mixedRequestError } = await requester.client.rpc(
        "request_to_join_team",
        { _team_id: mixedRaceTeam },
      );
      assert.ifError(mixedRequestError);
      assert.ok(mixedRequestId);

      const mixedRace = await Promise.all([
        accept(inviteeOne, mixedInvitation),
        owner.rpc("approve_team_join_request", { _request_id: mixedRequestId }),
      ]);
      assert.equal(mixedRace.filter((result) => !result.error).length, 1);
      assert.equal(mixedRace.filter((result) => /TEAM_FULL/.test(result.error?.message ?? "")).length, 1);
      assert.equal(
        await activeCount(mixedRaceTeam),
        25,
        "concurrent invitation acceptance and request approval admit only one final member",
      );

      const rateActor = users[27];
      const joinRateTeams: string[] = [];
      for (let index = 0; index < 21; index += 1) {
        joinRateTeams.push(await createTeam(owner, `Join rate ${testRun}-${index}`));
      }
      const joinRateResults = await Promise.all(
        joinRateTeams.map((rateTeamId) => rateActor.client.rpc("request_to_join_team", {
          _team_id: rateTeamId,
        })),
      );
      assert.equal(joinRateResults.filter((result) => !result.error).length, 20);
      assert.equal(
        joinRateResults.filter((result) => /JOIN_REQUEST_RATE_LIMIT/.test(result.error?.message ?? "")).length,
        1,
      );

      const invitationRateTeams: string[] = [];
      for (let index = 0; index < 11; index += 1) {
        invitationRateTeams.push(await createTeam(rateActor.client, `Invitation rate ${testRun}-${index}`));
      }
      const invitationRateResults = await Promise.all(
        invitationRateTeams.map((rateTeamId) => rateActor.client.rpc("create_team_invitation", {
          _team_id: rateTeamId,
          _invitee_id: requester.id,
        })),
      );
      assert.equal(invitationRateResults.filter((result) => !result.error).length, 10);
      assert.equal(
        invitationRateResults.filter((result) => /INVITATION_RATE_LIMIT/.test(result.error?.message ?? "")).length,
        1,
      );
    } finally {
      // Every team is registered immediately after creation for local cleanup.
    }
  },
);
