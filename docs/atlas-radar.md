# Atlas Radar V1 (2026 release candidate)

Extends the existing Atlas Pro opportunity planner, preserving its branch, equipment, time, connectivity and self-reported readiness controls. It does not implement live news, AI, Maps, jobs, market demand, geolocation, or automatic monitoring. It has no network request, storage, new dependency, migration or additional credit consumption. The existing UI tier gate is retained; this is a public static catalogue, not server-enforced premium data.

## Pilot

`VITE_ATLAS_RADAR_ENABLED=true` enables the new section at build time for the existing effective Atlas Pro audience. Leave it unset in production until authenticated mobile/desktop preview testing. When disabled the original planner remains. A Vite flag is a display switch, not a security boundary. No backend feature entitlement is enabled.

Three manually selected Kenyan source excerpts were inspected on 2026-11-27. The original page fetches failed; the catalogue explicitly describes this limitation and links the original pages for verification. KNA reported the digital commerce programme launch on 19 Nov and the MICE growth target on 6 Nov; KNBS Q2 2026 publication excerpt reported construction growth of 6.0%. Source excerpts are not evidence of local demand, actual programme eligibility or job availability. Targets are not achievements; the examples are hypotheses. Each signal's review deadline is 2026-12-27 UTC. At/after that day, cards become historical and no sample actions are surfaced until a maintainer updates the source and review dates after verification. Dates are client-side display logic, not authorization. Do not simply extend the review date without checking the evidence. Do not advertise as live intelligence.

All 18 existing branches have at least one matched experiment; users may explicitly explore other sectors. A missing device or insufficient time produces a no-purchase research step. Phone-compatible options include paper sketches; computer options require suitable existing software. No income estimate, legal or investment advice, or private customer information is requested. Sources use fixed HTTPS links; no user-supplied URLs, scraping or generated claims.

## Verification checklist

- Existing `tests/atlas-opportunity.test.ts` includes Radar tests; current CI already runs it.
- Full CI and authenticated preview: elite/founder vs other tiers; switch account and branch; flag off/on; mobile layout, source links, equipment/time and other-sector filters; stale cards; no API or storage calls from Radar.
- Verify original source content and update catalogue if necessary before enabling the feature. All wider launch checks remain separate.
