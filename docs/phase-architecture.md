# Phase architecture

The phase system is a **derived layer** on top of the existing curriculum.
Nothing in `Category → Branch → Lesson` changed, so every existing route,
Focus Mode session, progress record and Atlas call keeps working.

```text
Category
  Branch
    Phase        explorer | builder | professional | elite
      Module     themed group of missions, may end in a Project
        Mission  a coherent build goal
          Lesson the existing Lesson shape (unchanged)
        Project  reviewable capstone of the module
```

## Where things live

```text
src/data/curriculum/phaseTypes.ts    Types + PHASES registry (tiers, order, XP multipliers)
src/data/curriculum/phaseContent.ts  Authored content registry (empty) + validator
src/lib/phases/engine.ts             Resolution, unlocking, progress, lookup
src/lib/phases/xp.ts                 XP + level computation (derived, not stored)
src/lib/phases/portfolio.ts          Module projects -> portfolio projects
src/lib/phases/atlasBridge.ts        Compact snapshot for Atlas
src/lib/phases/usePhases.ts          React read API
src/lib/phases/index.ts              Public barrel — import from "@/lib/phases"
```

## Backward compatibility

- **Explorer is never authored.** `deriveExplorer()` synthesizes it from
  `Branch.lessons` and `Branch.projectArc`, so all 18 branches already resolve
  to a valid phase tree with zero content work.
- **No new persistence.** A phase lesson is completed by the same
  `completeSession(lessonId)` call Focus Mode already makes; XP, levels,
  achievements and portfolio state are pure functions of
  `completedSessions` + `streak`.
- **Phases without content** report `hasContent: false` and lock with
  `lockedBy: "no-content"` — the UI can show them as "coming soon" instead of
  breaking.

## Unlock rules

Checked in order, first match wins:

1. `no-content` — nothing authored for that branch/phase yet.
2. `prerequisite` — the previous phase in `PHASE_ORDER` is not complete.
3. `tier` — subscription below `PhaseDefinition.requiredTier`.

| Phase        | Required tier      | Requires     | XP multiplier |
| ------------ | ------------------ | ------------ | ------------- |
| Explorer     | free (Explorer)    | —            | 1x            |
| Builder      | builder (KSh 99)   | Explorer     | 1.5x          |
| Professional | creator (KSh 299)  | Builder      | 2x            |
| Elite        | visionary (KSh 499)| Professional | 3x            |

## XP model

`computeXp(completedIds, streak)` — base 50 XP per lesson scaled by the phase
multiplier, plus bonuses: mission 100, module 250, project 400, phase 750,
and 10 XP per streak day capped at 300. Levels are 1000 XP each with titles
mapped loosely onto the phase ladder.

## Adding curriculum

Append to `phaseContent` in `src/data/curriculum/phaseContent.ts`:

```ts
{
  branchId: "web-development",
  phaseId: "builder",
  overview: "Ship a multi-page product site backed by real data.",
  modules: [
    {
      id: "web-builder-m1",
      title: "Data-driven pages",
      description: "...",
      missions: [
        {
          id: "web-builder-m1-mi1",
          title: "Model the content",
          objective: "...",
          outcome: "...",
          difficulty: "Builder",
          lessons: [/* standard Lesson objects */],
        },
      ],
      project: {
        id: "web-builder-m1-project",
        title: "Live product site",
        summary: "...",
        deliverables: ["Deployed URL", "README"],
        skills: ["React", "Data modelling"],
        requiredLessonIds: ["web-builder-m1-l1"],
        reviewable: true,
        estimatedEffort: "1 week",
      },
    },
  ],
}
```

Conventions (checked by `validatePhaseContent()`):

- Lesson ids are globally unique and prefixed `<branchId>-<phaseId>-`.
- Every module has at least one mission; every mission at least one lesson.
- A project's `requiredLessonIds` must exist inside its own module.
- Never author `phaseId: "explorer"` — it is derived.

## Consuming from UI

```tsx
const { phaseStates, currentPhase, xp, level, projects } = usePhases(branchId);
```

Each `PhaseState` carries `unlocked`, `lockedBy`, `completed`, `total`,
`percent`, `isComplete` and `nextLessonId` — enough to render a phase card,
a progress ring, an upgrade CTA and a "continue" button without extra logic.

## Atlas integration

`buildAtlasPhaseSnapshot(branchId, completedIds, tier, streak)` returns the
learner's phase position, lock reasons, XP and level in a flat shape that can
be dropped into the mentor brief; `describePhasePosition()` renders the
one-line version used in prompts.
