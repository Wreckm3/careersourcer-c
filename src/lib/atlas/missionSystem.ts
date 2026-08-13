import type { Branch, Category } from "@/data/curriculum/types";
import { meetsTier, type Tier } from "@/lib/tiers";
import type { AtlasMemory, AtlasMissionResource, AtlasMissionSystemState } from "./types";

const STARTER_MISSION_LENGTH = 5;

function findBranch(categories: Category[], branchId?: string | null): Branch | null {
  if (!branchId) return null;
  return categories.flatMap((category) => category.branches).find((branch) => branch.id === branchId) ?? null;
}

function resourceForNeed(branch: Branch, need: string | null): AtlasMissionResource | null {
  if (!need) return null;
  const words = need.toLowerCase().match(/[a-z]{4,}/g) ?? [];
  if (!words.length) return null;
  const candidates = branch.lessons.flatMap((lesson) =>
    (lesson.resources ?? []).map((resource) => ({ resource, lesson })),
  );
  const match = candidates.find(({ resource, lesson }) => {
    const text = `${resource.label} ${lesson.title} ${lesson.mission} ${lesson.challenge}`.toLowerCase();
    return words.some((word) => text.includes(word));
  });
  if (!match) return null;
  return {
    label: match.resource.label,
    url: match.resource.url,
    why: `It is already curated for ${match.lesson.title} and matches the concept you said is blocking you.`,
  };
}

function evidenceSkills(branch: Branch, completedIds: string[]) {
  const completed = new Set(completedIds);
  return Array.from(new Set(
    branch.lessons
      .filter((lesson) => completed.has(lesson.id))
      .flatMap((lesson) => lesson.skills ?? lesson.tools),
  )).slice(0, 6);
}

/**
 * Builds a mission only from the curriculum, completed build confirmations and
 * learner-reported struggles. No inferred aptitude or invented resource data.
 */
export function buildAtlasMissionSystemState(args: {
  categories: Category[];
  selectedPath?: string | null;
  completedSessions: string[];
  memory: AtlasMemory;
  tier: Tier;
}): AtlasMissionSystemState {
  const branch = findBranch(args.categories, args.selectedPath);
  if (!branch) {
    return {
      branchId: null, branchTitle: null, starterCompleted: 0, starterTotal: STARTER_MISSION_LENGTH,
      starterComplete: false, review: [], nextMission: null, resource: null, teachAnotherWay: null,
      isExpandedMissionUnlocked: meetsTier(args.tier, "builder"),
    };
  }

  const starterLessons = branch.lessons.slice(0, Math.min(STARTER_MISSION_LENGTH, branch.lessons.length));
  const starterCompleted = starterLessons.filter((lesson) => args.completedSessions.includes(lesson.id)).length;
  const starterComplete = starterLessons.length > 0 && starterCompleted === starterLessons.length;
  const skills = evidenceSkills(branch, args.completedSessions);
  const openStruggle = args.memory.struggleLog.find((item) => !item.resolved)?.topic ?? null;
  const review = starterComplete
    ? [
        `You completed ${starterCompleted} starter missions in ${branch.title}.`,
        skills.length ? `Your completed builds provide evidence of practice with ${skills.join(", ")}.` : "Your completed missions are the evidence Atlas can use so far.",
        ...(openStruggle ? [`You told Atlas that ${openStruggle} is still getting in the way.`] : []),
      ]
    : [`You have completed ${starterCompleted} of ${starterLessons.length} starter missions. Finish the starter mission before Atlas recommends a deeper build.`];
  const focus = openStruggle ? `strengthen the part that is blocking you: ${openStruggle}` : "turn the foundations you completed into a working system";
  const nextMission = starterComplete ? {
    title: `Build your next ${branch.title} system`,
    objective: `Use what you completed in the starter mission to ${focus}.`,
    whyThisMatters: branch.projectArc?.promise ?? "A useful next mission should produce something you can show, not another playlist.",
    skills,
    estimatedEffort: "1 focused build session",
    steps: ["Choose one small feature or outcome.", "Build it using the starter skills you already practised.", "Check it against the mission objective.", "Save evidence or a short reflection for your portfolio."],
  } : null;
  const resource = resourceForNeed(branch, openStruggle);
  const teachAnotherWay = openStruggle ? {
    explanation: `Atlas should explain ${openStruggle} in plain language, tied to the learner's current build.`,
    example: "Use a tiny example from the current mission before introducing another tool or topic.",
    checkpoint: "Ask one short question that checks the idea, not whether they memorised a definition.",
    challenge: "Give one small practical change they can make in their build, then review what happened.",
  } : null;

  return {
    branchId: branch.id, branchTitle: branch.title, starterCompleted, starterTotal: starterLessons.length,
    starterComplete, review, nextMission, resource, teachAnotherWay,
    isExpandedMissionUnlocked: meetsTier(args.tier, "builder"),
  };
}
