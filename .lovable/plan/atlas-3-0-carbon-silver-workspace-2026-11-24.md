# Atlas 3.0 — Carbon Silver Workspace

## Goal
Redesign only `/atlas` as a premium, responsive mentor workspace while preserving the exact Atlas icon and all existing authentication, memory, streaming, entitlement, and learning-data behavior.

## Work
- Apply an Atlas-only Carbon Silver palette and restrained motion; leave global CareerSourcer branding and other pages unchanged.
- Build a responsive workspace with collapsible navigation, primary conversation, and optional learning/project context. Focus mode collapses both side panels; mobile uses accessible drawers.
- Replace the workspace's long generated welcome with the supplied heading, supporting line, and four prompt cards. Cards fill the composer without sending a request.
- Add Adaptive, Learn, Build, Challenge, and Career controls using prompt framing supported by the current conversation flow; do not add API parameters or backend behavior.
- Improve workspace messages with accessible Markdown/code styling, copy, retry, smart scrolling, clear errors, and the existing loading/streaming behavior. Do not add unsupported controls.
- Show only real branch, mission, project, progress, XP, level, streak, and tier data. Provide a `/paths` empty-state destination when no branch is selected.
- Search actual current and recent Atlas messages. Existing memory stores a flat recent-message list rather than saved threads; do not invent thread restoration or add persistence/schema.

## Technical details
- Keep `/atlas` as the route and `AtlasWorkspace` as the data/state orchestrator; isolate presentational regions under `src/components/atlas/`.
- Reuse `AtlasChat`, its controller, memory service, transport, subscription checks, `useProgress`, and `usePhases`. Keep the separate floating-chat appearance and behavior intact.
- Define semantic Atlas color tokens scoped to the Atlas root; preserve `/atlas-icon.png` exactly. Respect reduced motion and keyboard access.
- Do not modify database schemas, edge functions, API keys, payments, or unrelated CareerSourcer pages.

## Validation
- Run relevant existing tests and confirm the preview build succeeds.
- Verify signed-in Atlas conversation, composer suggestions, focus/sidebar controls, contextual data, and desktop/mobile layouts in the browser.
