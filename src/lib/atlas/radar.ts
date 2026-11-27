import type { OpportunityInput } from "./opportunityEngine";

/** Static, editor-reviewed search excerpts. No news fetch, location lookup, model or income forecast. */
type Experiment = {
  branches: readonly string[];
  opportunity: string;
  sample: string;
  validate: string;
  computer: boolean;
  minutes: 30 | 60 | 120;
};
type Signal = {
  id: string;
  sector: string;
  title: string;
  publisher: string;
  url: string;
  period: string;
  evidence: string;
  kind: "reported launch" | "stated target" | "reported statistic";
  possibleEffect: string;
  experiments: readonly Experiment[];
};
const REVIEWED_ON = "2026-11-27";
const REVIEW_DUE = "2026-12-27";
const signals: readonly Signal[] = [
  {
    id: "ke-digital-commerce-2026-11", sector: "Digital commerce", title: "Digital commerce support for small enterprises",
    publisher: "Kenya News Agency", url: "https://www.kenyanews.go.ke/msea-launches-digital-commerce-programme-to-boost-women-youth-enterprises/",
    period: "19 Nov 2026", kind: "reported launch",
    evidence: "A Kenya News Agency search excerpt dated 19 November reports the launch of an MSEA digital commerce programme for women and youth enterprises.",
    possibleEffect: "If participating sellers adopt online sales, some may need clearer product information, order workflows or content. Participation, procurement and local demand are not confirmed.",
    experiments: [
      { branches: ["web-development", "app-development", "ui-ux-design", "e-commerce"], opportunity: "Product catalogue and enquiry flow", sample: "Sketch or build a fictional seller's mobile-friendly catalogue with three products and a simple enquiry flow. Do not collect customer data.", validate: "Ask a consenting seller how customers currently find product details and what questions they repeat. Test the sample only with permission.", computer: false, minutes: 60 },
      { branches: ["ai-automation", "cybersecurity"], opportunity: "Safer, simpler order workflows", sample: "Map an example order process using fictional records; identify one repetitive step and a privacy or account-safety improvement. Use paper or existing tools, not paid APIs.", validate: "Ask an owner which manual step causes errors and which data must remain private. Never inspect or test their systems without permission.", computer: false, minutes: 60 },
      { branches: ["digital-marketing", "graphic-design", "content-creation", "video-editing", "photography", "freelancing", "entrepreneurship"], opportunity: "Product communication sample", sample: "Create one original sample product card or short promotional concept for an imaginary small business.", validate: "Ask a consenting seller whether the sample addresses a real customer question. Ask what they already use and what would make a change worthwhile.", computer: false, minutes: 30 },
    ],
  },
  {
    id: "ke-mice-tourism-2026-11", sector: "Tourism and events", title: "Kenya's meetings and events growth ambition",
    publisher: "Kenya News Agency", url: "https://www.kenyanews.go.ke/kenya-targets-60-per-cent-mice-growth-as-infrastructure-and-tourism-investment-opportunities-expand/",
    period: "6 Nov 2026", kind: "stated target",
    evidence: "A Kenya News Agency search result dated 6 November describes a target for growth in meetings, incentives, conferences and exhibitions (MICE). A target is not an achieved result.",
    possibleEffect: "If events expand, organizers and vendors may need information pages, event visuals, local content or visitor experiences. Actual bookings and budgets need independent confirmation.",
    experiments: [
      { branches: ["web-development", "app-development", "ui-ux-design", "e-commerce", "ai-automation"], opportunity: "Event information and enquiry prototype", sample: "Build or sketch a fictional event schedule, venue information and enquiry flow. Use dummy details and no real payment or attendee records.", validate: "Ask an organizer which attendee questions consume time and whether the prototype would solve one of them.", computer: false, minutes: 60 },
      { branches: ["game-development", "blender-3d", "animation"], opportunity: "Small interactive visitor experience", sample: "Use an existing tool to make one small fictional venue scene, interactive waypoint or animated preview. Do not recreate restricted sites or use unlicensed assets.", validate: "Ask consenting testers whether the experience helps them understand a venue; ask an organizer whether that problem exists before expanding it.", computer: true, minutes: 120 },
      { branches: ["graphic-design", "content-creation", "video-editing", "photography", "music-production", "digital-marketing", "freelancing", "entrepreneurship"], opportunity: "Event communication sample", sample: "Make a single original fictional event poster, storyboard, photo concept or audio sketch appropriate to your skills.", validate: "Ask a consenting organizer what materials are missing and how they judge quality. Respect asset licensing and venue permissions.", computer: false, minutes: 30 },
    ],
  },
  {
    id: "ke-construction-2026-q2", sector: "Construction", title: "Construction activity in Kenya's Q2 2026 GDP report",
    publisher: "Kenya National Bureau of Statistics", url: "https://mdm.knbs.or.ke/entities/publication/4c047f9c-5148-4361-9e1d-270ecbba4ed4/full",
    period: "Q2 2026 compared with Q2 2025", kind: "reported statistic",
    evidence: "The KNBS repository search excerpt for its Q2 2026 GDP publication reports 6.0% construction growth. This is a national historical statistic, not a county-level forecast.",
    possibleEffect: "If individual projects need more coordination or clearer customer communication, some firms may benefit from simple administrative tools and visual samples. National growth does not establish a specific firm's needs.",
    experiments: [
      { branches: ["web-development", "app-development", "ai-automation", "ui-ux-design", "entrepreneurship", "freelancing"], opportunity: "Contractor enquiry or task-tracking sample", sample: "Design a fictional request tracker for a contractor, with three example requests and a clear status. Do not store real customer or financial records.", validate: "Ask a consenting business owner how enquiries or job updates are tracked today. Identify a measurable problem before building a larger system.", computer: false, minutes: 60 },
      { branches: ["blender-3d", "animation", "game-development", "graphic-design"], opportunity: "Non-engineering visual concept", sample: "Create a simple fictional product mock-up or low-poly scene from original assets. Label it a visualization, not a structural or safety design.", validate: "Ask a consenting potential user whether the sample communicates the concept; never represent it as professionally approved construction documentation.", computer: true, minutes: 120 },
      { branches: ["personal-finance"], opportunity: "Practice project budgeting", sample: "Draft an educational worksheet with fictional costs, contingency and actual-versus-planned spending. Do not offer investment advice or collect financial records.", validate: "Ask a trusted person if they can interpret the worksheet; check the calculations using dummy figures.", computer: false, minutes: 30 },
    ],
  },
];

export function getRadarSignals(input: OpportunityInput, nowMs: number, includeOther = false) {
  if (!Number.isFinite(nowMs) || Math.abs(nowMs) > 8.64e15) return [];
  const today = new Date(nowMs).toISOString().slice(0, 10);
  if (today < REVIEWED_ON) return [];
  const stale = today >= REVIEW_DUE;
  return signals.flatMap(signal => {
    const matching = signal.experiments.filter(item => item.branches.includes(input.branchId));
    if (!matching.length && !includeOther) return [];
    return [{
      id: signal.id, sector: signal.sector, title: signal.title, publisher: signal.publisher, url: signal.url,
      period: signal.period, kind: signal.kind, evidence: signal.evidence, possibleEffect: signal.possibleEffect,
      reviewedOn: REVIEWED_ON, reviewDue: REVIEW_DUE, stale, relevant: matching.length > 0,
      experiments: stale ? [] : (matching.length ? matching : signal.experiments.slice(0, 1)).map(item => {
        const blockers = [
          ...(input.device === "neither" || (item.computer && input.device !== "computer") ? ["Required equipment is not confirmed."] : []),
          ...(input.minutes < item.minutes ? ["The sample needs a longer session."] : []),
        ];
        return {
          opportunity: item.opportunity, minutes: item.minutes, blockers,
          nextAction: blockers.length ? "Sketch the problem on paper or ask one trusted person about it. Do not purchase equipment or stock." : input.readiness === "learning" ? item.sample : `Use or improve an original sample you can demonstrate: ${item.sample}`,
          validate: item.validate,
        };
      }),
    }];
  });
}
