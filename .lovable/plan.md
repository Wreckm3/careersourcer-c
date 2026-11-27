# Seasonal Theme System

## Goal
Add automatic, reusable seasonal presentation effects without changing existing layouts or product behavior. Christmas is the first fully interactive theme; all requested seasonal dates are supported by the same calendar engine.

## Scope
- Add a date-driven engine and seasonal presentation components, with only minimal app-root wiring.
- Use Africa/Nairobi calendar dates. Defaults: Christmas Dec 1–25; New Year Dec 26–Jan 2; Easter Good Friday through Easter Monday; April Fools on Apr 1; recurring Kenyan public holidays on Labour Day (May 1), Madaraka Day (Jun 1), Mashujaa Day (Oct 20), and Jamhuri Day (Dec 12).
- Christmas: lightweight snowfall, subtle snow caps on selected headings/cards/path surfaces, a click-to-build snowman, and occasional clickable Santa gifts with prewritten project ideas.
- Provide season-specific decoration presets for New Year, Easter, Kenyan holidays, and April Fools through the same engine; no paid services or generated content.
- Add an accessible seasonal-effects toggle saved locally. Respect reduced-motion, pause when the tab is hidden, and cap visual work for smaller/mobile devices.
- Exclude `/atlas` entirely. Do not touch authentication, payments, XP, learning data, database, or existing learning flows. Do not deploy.

## Technical approach
- Keep calendar rules in `src/lib/seasonal/` and presentation in `src/components/seasonal/`; scope styles to a seasonal root and reuse semantic CSS tokens.
- Wire one seasonal root at the application shell, without editing individual pages. Use Nairobi date parts and a pure Gregorian Easter calculation; define overlapping seasons by explicit priority.
- Add focused unit tests for timezone boundaries and each date rule. Verify the toggle, gift interaction, snowman progression, Atlas exclusion, reduced-motion behavior, and mobile rendering in the running preview.
- Record the seasonal module boundary in `AGENTS.md` so future seasonal work remains isolated.

## Branch constraint
The workspace is currently on `main`, and branch switching is unavailable here. Hold all application changes until the user chooses whether to proceed on the current branch or wait for a separate development branch.