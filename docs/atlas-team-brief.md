# Atlas team brief pilot

This is the no-cost first step toward @Atlas team intelligence. It is not an LLM integration or a bot account. The optional pilot is controlled by `VITE_ATLAS_TEAM_BRIEF_ENABLED=true`; keep disabled until browser testing. It uses the already-loaded, RLS-protected project tasks, never private Atlas memory, individual assessments, user IDs in output, or team message history. Commands are restricted to `@Atlas status`, `@Atlas blockers`, and `@Atlas next`. Responses are deterministic; priorities are heuristics, not dependency analysis. Loaded tasks may be incomplete (200-row cap).

The learner explicitly asks in the separate command composer. Results are private until the learner chooses to use a draft and manually sends it via the existing member-authored discussion RPC. No automatic sending, impersonation, database schema changes, new provider calls, credits, or payment changes. Existing assigned-task recommendations remain a separate metered feature; hide their output when account/team/project changes. Do not pass private recommendations into the shared draft.

## Browser acceptance checklist
- Enable the flag in a non-production preview, sign in with an authorized team member, and open a project with mixed task states.
- Verify all three commands, unsupported command handling, existing drafts not overwritten, manual send, and the sender remains the real learner.
- Switch projects/accounts during task recommendation generation; no stale brief or private answer should be rendered in the new scope.
- Confirm normal discussion, RLS and task operations still work; verify no extra model request is made for briefs. Keep AI paused.
- Before later enabling genuine AI group chat, implement explicit consent and server-authorized shared context, metering, bot attribution, request deduplication, and tests for cross-team leakage. Private feedback stays separate; never reuse personal memory in shared messages.
