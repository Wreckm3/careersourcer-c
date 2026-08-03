# Atlas Mentor Architecture

Atlas is organized as a state-aware mentor, not a generic chat widget. The UI
renders messages and controls only; learning state, memory, recommendations,
planning, and subscription capabilities live in reusable services under
`src/lib/atlas`.

## Flow

```txt
Atlas UI
  -> Conversation Controller
  -> Memory Service
  -> Progress Service
  -> Goal Engine
  -> Project Planner
  -> Recommendation Engine
  -> Subscription Capabilities
  -> Atlas Transport / Supabase Edge Function
```

## Core Modules

- `types.ts` defines conversation modes, memory, goals, projects, milestones,
  recommendations, personality, and subscription capability contracts.
- `conversationController.ts` determines the mode, loads memory, derives
  progress, applies goals, chooses recommendations, and builds the request.
- `memoryService.ts` persists authenticated user memory in local storage and
  `public.atlas_memories`.
- `goalEngine.ts` maps learner-stated goals to structured project prompts.
- `projectPlanner.ts` initializes generic project roadmaps as milestones,
  tasks, resources, and completion state.
- `recommendationEngine.ts` returns mocked next-step recommendations from
  state. It is the replacement point for a future AI recommender.
- `progressService.ts` projects existing CareerSourcer lesson progress into
  reusable Atlas progress snapshots.
- `personality.ts` keeps Atlas values and speaking style out of UI and
  orchestration logic.
- `subscriptionCapabilities.ts` maps Explorer, Builder, Creator, and Founder
  product capabilities to the current subscription enum.

## Persistence

`public.atlas_memories` belongs to authenticated users and is protected by RLS.
It stores current goal, project, milestone, completed foundations, conversation
recency, strengths, weaknesses, interests, preferred difficulty, tier, and last
active date.

The service writes local storage first, then cloud. This keeps Atlas usable if a
cloud write fails and gives future server-side memory a stable replacement
boundary.

## Sprint Boundaries

- Builder architecture is implemented for project memory, roadmap persistence,
  and milestone tracking.
- Creator and Founder-specific behavior remains an extension point.
- Recommendations are intentionally mocked and deterministic.
- TODO: add explicit UI for editing goals, strengths, weaknesses, interests,
  and preferred difficulty.
- TODO: add server-side long-term memory retrieval once Atlas no longer relies
  on client-sent memory context.
