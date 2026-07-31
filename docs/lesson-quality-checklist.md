# Lesson Quality Checklist

Run this checklist against **every** mission before it ships. A mission that fails
any item does not go live — it gets rewritten or dropped.

## Non-negotiables

- [ ] **Builds something.** The learner ends with a file, a page, a design, a post,
      a profile, a render, or a measurable action — never "understanding".
- [ ] **Beginner-readable.** A 14-year-old with no prior exposure can follow it.
      No jargon without an immediate, one-line plain-English translation.
- [ ] **~10 minutes.** Realistically completable in 8–15 minutes, video included.
- [ ] **Theory minimized.** No history, no origin stories, no academic definitions.
      Concepts appear only where they are applied in the same mission.
- [ ] **Video earns its place.** Practical, build-along, short, current tools.
      Rejected if it opens with a long self-intro, history, or definition dump.
- [ ] **Pulls forward.** The outcome sets up the next mission; the learner has a
      concrete reason to continue.

## Field checklist

| Field | Rule |
|---|---|
| `title` | Mission-style verb phrase. Never "What is X?" or "Introduction to X". |
| `mission` | One sentence, starts with a verb, states the build. |
| `intro` | Max ~55 words. Only what's needed to start. |
| `outcome` | A nameable artifact ("a live about-me page", not "confidence in HTML"). |
| `challenge` | Specific and checkable — a learner can honestly say done / not done. |
| `builderTip` | A real tool or shortcut that helps *this* mission. No filler. |
| `tools` | Free wherever possible; phone-friendly where the craft allows. |
| `difficulty` | Missions 1–2 Starter, 3–4 Builder, 5 Advanced. |
| `duration` | Honest estimate, 8–15 min. |
| `premium` | `true` on missions 4–5 only. Missions 1–3 stay free. |

## Video curation rules

Select for teaching quality, not popularity.

**Length is a hard gate.** Ideal 5–12 min · acceptable 12–18 min · maximum 20 min.
Full courses, crash courses, multi-hour marathons, embedded playlists and lecture
recordings are never imported. If the only strong resource is long, either link a
timestamped section or split the topic into two shorter missions.

**Accept** when the video is beginner-friendly, project-driven, well-structured,
current with modern tools, and starts building within the first minute.

**Reject** when it: exceeds 20 minutes, opens with minutes of self-introduction,
spends significant time on history or definitions ("What is X?", TED-style talks),
repeats obvious information, delays hands-on work, or relies on paid software when
a free alternative teaches the same skill.

Every video must be verified before shipping: embeddable **and** within the length
gate. Run `python3 scripts/check-videos.py` (duration + embed check) and reject
anything it marks REJECT.


## Free vs premium

Missions 1–3 of every branch are free and must, on their own, get a learner to a
finished beginner project they can show someone. Missions 4–5 are premium and
carry the advanced build, the publishing/monetising step, and deeper builder tips.
The free tier must never feel like a demo.
