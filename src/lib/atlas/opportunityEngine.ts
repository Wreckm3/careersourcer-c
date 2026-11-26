/** Educational experiments, not live listings, demand estimates, or income promises. */
export type OpportunityDevice = "phone" | "computer" | "neither";
export type OpportunityReadiness = "learning" | "sample" | "reviewed";
export type OpportunityInput = {
  branchId: string;
  device: OpportunityDevice;
  minutes: 30 | 60 | 120;
  internet: boolean;
  readiness: OpportunityReadiness;
};

type Idea = { title: string; audience: string; sample: string; check: string; computer: boolean; internet: boolean; minutes: 30 | 60 | 120 };
const ideas: Record<string, Idea> = {
  "web-development": { title: "Simple business landing page", audience: "An independent shop or service provider", sample: "Build a one-page demo with fictional details, a service list and contact layout.", check: "Ask whether customers struggle to find services or contact details, and show the demo only with permission.", computer: true, internet: false, minutes: 60 },
  "game-development": { title: "Small playable prototype", audience: "An indie creator or student game club", sample: "Create a single playable mechanic using tools and assets you already have.", check: "Ask a consenting tester to try it and note one usability problem; ask creators whether they need that type of prototype.", computer: true, internet: false, minutes: 120 },
  "app-development": { title: "Simple workflow app mock-up", audience: "A small team with a repetitive manual task", sample: "Make a clickable or paper-backed mock-up using fictional data.", check: "Ask how the team handles the task today and what a useful improvement would look like.", computer: true, internet: false, minutes: 60 },
  "ai-automation": { title: "Repetitive-task workflow demo", audience: "A small team with recurring administrative work", sample: "Map a repetitive process and prototype a rule-based automation using dummy data, no paid API.", check: "Ask which manual step takes the most effort and whether your proposed workflow would help.", computer: true, internet: false, minutes: 60 },
  "ui-ux-design": { title: "Usability redesign sample", audience: "An owner of a small website or app", sample: "Sketch a clearer screen using an invented example, with reasons for your changes.", check: "Ask potential users to explain where they get confused; do not assume the redesign is better.", computer: false, internet: false, minutes: 30 },
  "cybersecurity": { title: "Cyber hygiene educational checklist", audience: "A small organization interested in safer account habits", sample: "Create a basic checklist for passwords, backups and updates using a fictional organization.", check: "Ask what security topics are confusing. Never test, scan or access real systems without explicit authorization.", computer: false, internet: false, minutes: 30 },
  "freelancing": { title: "One clearly scoped service sample", audience: "A potential client who needs a task you can already demonstrate", sample: "Write a one-page offer and create an original sample with clear boundaries.", check: "Ask whether the task is useful and what acceptance criteria a client would expect.", computer: false, internet: false, minutes: 30 },
  "content-creation": { title: "Short educational content sample", audience: "A community group or small creator", sample: "Plan and record a short original video with your existing device.", check: "Ask a consenting viewer whether the message is understandable and useful.", computer: false, internet: false, minutes: 30 },
  "entrepreneurship": { title: "Customer problem interview", audience: "People who experience a problem you want to solve", sample: "Draft five neutral interview questions and a small no-inventory solution sketch.", check: "Interview people with consent; ask about actual past behavior rather than whether they like your idea.", computer: false, internet: false, minutes: 30 },
  "digital-marketing": { title: "Organic content plan", audience: "A small business with a clear audience", sample: "Make three fictional organic post concepts with a measurable objective; do not buy ads.", check: "Ask the owner what outcome matters and whether the message matches their customers.", computer: false, internet: false, minutes: 30 },
  "e-commerce": { title: "Product listing improvement sample", audience: "A seller with existing products", sample: "Draft a fictional product listing and a simple order checklist without purchasing stock.", check: "Ask what questions customers repeatedly ask and whether the listing answers them.", computer: false, internet: false, minutes: 30 },
  "personal-finance": { title: "Budget worksheet practice", audience: "A learner who wants to understand basic budgeting", sample: "Create a simple worksheet with fictional amounts, separating needs, savings and optional spending.", check: "Ask a consenting person whether the worksheet is understandable; do not request financial records or offer regulated advice.", computer: false, internet: false, minutes: 30 },
  "graphic-design": { title: "Poster design sample", audience: "A community event organizer or small shop", sample: "Design an original fictional event poster using tools already available.", check: "Ask whether the main message, date and action are readable at a glance.", computer: false, internet: false, minutes: 60 },
  "video-editing": { title: "Short edited video sample", audience: "A local creator or organization", sample: "Edit a short clip from your own footage, with readable captions and clean cuts.", check: "Ask whether the pacing and message are useful. Obtain permission before using someone else's footage.", computer: false, internet: false, minutes: 60 },
  "blender-3d": { title: "Low-poly product mock-up", audience: "A creator who needs a simple visual concept", sample: "Model a fictional low-poly object using existing 3D software and export a still image.", check: "Ask whether the image communicates the shape clearly. Check your hardware before attempting large scenes.", computer: true, internet: false, minutes: 120 },
  "animation": { title: "Short storyboard or animation test", audience: "A small creator with an explanation to communicate", sample: "Draw a six-frame original storyboard or create a short simple motion test.", check: "Ask whether viewers can follow the sequence without narration.", computer: false, internet: false, minutes: 60 },
  "photography": { title: "Product photography sample", audience: "A small product seller", sample: "Photograph an object you own using existing light and equipment; compare two compositions.", check: "Ask whether the images convey product details clearly. Obtain consent before photographing people or property.", computer: false, internet: false, minutes: 30 },
  "music-production": { title: "Original short audio sample", audience: "A creator who needs original audio", sample: "Make a short original audio sketch using available recording tools; avoid unlicensed samples.", check: "Ask whether the mood fits the intended use and clarify usage rights before any commercial work.", computer: false, internet: false, minutes: 60 },
};

export function planOpportunity(input: OpportunityInput) {
  const idea = Object.prototype.hasOwnProperty.call(ideas, input.branchId) ? ideas[input.branchId] : undefined;
  if (!idea) return null;
  const blockers: string[] = [];
  if (input.device === "neither" || (idea.computer && input.device !== "computer")) blockers.push("The sample requires equipment you have not confirmed access to.");
  if (input.minutes < idea.minutes) blockers.push("The sample needs more time than your selected session.");
  if (idea.internet && !input.internet) blockers.push("This sample requires internet access.");
  const ready = blockers.length === 0;
  const stage = !ready ? "research" : input.readiness === "learning" ? "practice" : "feedback";
  return {
    title: idea.title, audience: idea.audience, stage, blockers,
    nextAction: !ready ? "Spend this session sketching the idea on paper or asking one trusted person about the problem. Do not purchase equipment to test it." : input.readiness === "learning" ? idea.sample : `Review or improve your own sample: ${idea.sample} Then seek feedback.`,
    demandCheck: idea.check,
    accessNote: input.internet ? "Online feedback is optional; protect your personal information and use age-appropriate services." : "Use offline tools and feedback from trusted people; no internet search is required for this plan.",
    budgetNote: "Use only resources you already have. No new spending, paid API, ads or inventory is required for this experiment; existing data, power and travel costs may still apply.",
    source: "Educational idea catalog; demand and income are unverified." as const,
  };
}
