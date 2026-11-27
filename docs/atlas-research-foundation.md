# Atlas Research Engine — foundation (not a live provider)

This isolated module adds deterministic ranking and bounded tutorial-chain planning. No API requests, secrets, database migrations, UI changes, or billing changes. It uses synthetic test fixtures only. A candidate's check timestamp and compatibility labels must originate in a trusted server-controlled catalog or adapter; the module does not prove those assertions, verify availability, crawl websites, or independently judge video quality. Treat all external text as untrusted. Never present a planned artifact as completed work.

Next integration steps:
1. Define a server-owned catalog with provenance, exact tool/version compatibility and verified link records. Restrict source domains; do not fetch arbitrary URLs. Validate redirects and network destinations before any future server fetch.
2. Add a provider adapter, explicit feature gate, budget reservation, timeout, and durable cache keyed by normalized query and source/constraint versions. Default to disabled; never silently use paid research or send personal learner data to search providers.
3. Return only server-owned resource IDs to StudyFlow. Resolve approved IDs server-side; preserve current null-URL schema until both client and server are migrated and tested. Keep manual resources and existing roadmaps intact.
4. Test no-results, stale links, incompatible formats, untrusted content, consent, cost limits, and persistence on an isolated branch before deployment. No API funding needed for the foundation tests.

Local tests: `npx tsx --test tests/atlas-research.test.ts`.
