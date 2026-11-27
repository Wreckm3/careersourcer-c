# Curated catalogue cache and expansion

This change adds a bounded, per-Edge-Function-isolate LRU of deterministic curated plans (128 entries, five-minute TTL). It is not a persistent cache or live provider cache. Cold starts discard it. Authentication and founder authorization still run on every request before planning. Only normalized constraints matching known catalogue tokens are retained; unknown topics, artifacts or software bypass caching. No user identifiers, tokens, learner profiles, free-text prompts, or external responses are stored. The key preserves ordered stages, difficulty, time, connectivity, cost preference, device, software and artifacts. A catalogue eligibility fingerprint and per-resource review checks prevent stale or not-yet-reviewed entries from being returned, including across cached empty results. The immutable deployed catalogue is the implicit cache version; a deployment creates a fresh cache. No new tables, network requests, API spend, or activation flags.

Reviewed retrieved documentation on 2026-11-27:
- https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Basic_HTML_syntax
- https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/What_is_CSS
- https://docs.python.org/3.14/tutorial/introduction.html

These are documentation reviews, not live availability checks or hands-on verification. Times are editorial estimates. The CSS resource requires separate self-reported HTML familiarity, not just completing one syntax article; Python assumes prior basic programming knowledge and a ready Python 3.14 interpreter. Artifacts are planning metadata, not mastery claims. The existing Unity-only founder UI and browser link allowlist are deliberately unchanged; the added entries are available only to compatible server catalogue requests until a separate UI extension is validated. Every review expires after 30 days. The existing CI workflow already includes the expanded catalogue test file.

Future paid provider integration must use its own durable, privacy-scoped, versioned cache, request coalescing, expiry and independent cost controls. Never cache authorization decisions or private learner data in this shared plan cache. Keep the research activation switches disabled until controlled authenticated testing.
