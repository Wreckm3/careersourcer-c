# Curated research pilot service

`atlas-research` is an isolated, read-only endpoint for a founder pilot. It defaults to disabled unless `ATLAS_CURATED_RESEARCH_ENABLED=true`; no deployment or flag changes are part of this patch. Gateway JWT verification remains enabled and the handler verifies the user and the existing server-owned founder entitlement. It accepts only explicit, bounded self-reported planning constraints, never a user ID, external URL, or raw prompt. It makes no external research/AI requests and does not write to the database. Existing Atlas emergency shutdown, payments and metering remain untouched. This is not a claim of independently verified mastery, live search or current link health. The catalogue currently has two Unity documentation entries and expires after 30 days.

POST JSON example (founder session token and project publishable key required):

```json
{"stages":[["model-import"],["avatar"]],"difficulty":"intermediate","maxMinutes":60,"internet":true,"device":"computer","software":{"unity":"6.0"},"availableArtifacts":["fbx-model","humanoid-rig"]}
```

The service resolves only curated IDs from its own plan. `blockedStage` is zero-based or null; prerequisites and completed work remain unverified. No changes to StudyFlow schemas or UI yet. Next: isolated deployment and authenticated negative/positive tests, then a user-invoked StudyFlow panel for explicit constraints. Persistent links require a separate coordinated client/server/DB change. No automatic pilot activation. For future live search, implement a separate metered, privacy-reviewed provider adapter and cache, with per-user limits before enabling. This service still uses Supabase invocation/auth infrastructure and therefore has platform usage implications at scale.
