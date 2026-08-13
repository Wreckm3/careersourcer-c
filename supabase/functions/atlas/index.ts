// Atlas — CareerSourcer AI growth mentor.
//
// Streams a mentor reply over SSE. Auth + tier gating happen here; the client
// never sees LOVABLE_API_KEY and cannot self-declare its tier.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@4";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(6000),
});

const LessonContextSchema = z.object({
  skillLevel: z.string(),
  categoryId: z.string(),
  branchId: z.string(),
  lessonId: z.string(),
  mission: z.string(),
  missionCompleted: z.boolean(),
  toolsLearned: z.array(z.string()),
  projectCompleted: z.string().nullable(),
  progress: z.object({
    lessonIndex: z.number(),
    totalLessons: z.number(),
    completedInBranch: z.number(),
    percentBranch: z.number(),
    streakCurrent: z.number(),
  }),
  nextMission: z
    .object({ id: z.string(), title: z.string(), mission: z.string() })
    .nullable(),
});

/**
 * Learner profile — the memory surface Atlas grows into.
 *
 * Today it is a projection of local progress sent per request. When Atlas
 * becomes premium-personalised, this same shape gets loaded server-side from
 * the learner's row instead, plus stated goals and milestone state — the
 * prompt contract below does not have to change.
 */
const LearnerProfileSchema = z.object({
  missionsCompleted: z.number(),
  streakCurrent: z.number(),
  activeBranches: z
    .array(z.object({ branchId: z.string(), title: z.string(), completed: z.number(), total: z.number() }))
    .max(20),
  completedBranches: z.array(z.string()).max(30),
  recentOutcomes: z.array(z.string()).max(10),
  goals: z.array(z.string()).max(5).optional(),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  lessonContext: LessonContextSchema.nullish(),
  learnerProfile: LearnerProfileSchema.nullish(),
  atlasContext: z.unknown().nullish(),
});

type AtlasLevel = "guide" | "lite" | "smart" | "pro";

const LEVEL_BY_TIER: Record<string, AtlasLevel> = {
  free: "guide",
  builder: "lite",
  professional: "smart",
  elite: "pro",
};

const LEVEL_BRIEF: Record<AtlasLevel, string> = {
  guide:
    "You are Atlas Career Guide. Keep replies under 100 words. Help learners explore careers, understand beginner concepts, choose a branch, and take one small starter action. Do not claim to persist a roadmap or project memory.",
  lite:
    "You are Atlas Lite. Keep replies under 120 words. Coach, then give one concrete next action with a time estimate, and stop.",
  smart:
    "You are Atlas. Keep replies under 200 words. You may review the learner's project, name the single weakest part, and suggest one improvement plus one stretch idea.",
  pro:
    "You are Atlas Pro, a long-term growth mentor. Up to 320 words. Connect today's mission to a 3-month roadmap, portfolio quality, and how this becomes income or opportunity.",
};

/**
 * Atlas is a mentor, not a chatbot.
 *
 * The client sends a deterministic mentorBrief (current position, last
 * achievement, today's focus, coaching signals). The model's job is to deliver
 * that brief in Atlas's voice — not to invent its own agenda.
 */
function systemPrompt(level: AtlasLevel, ctx: unknown, profile: unknown, atlasContext: unknown) {
  return [
    "You are Atlas, the career mentor inside CareerSourcer. You have guided this learner before and you remember them.",

    "## Who you are",
    "Friendly, confident, encouraging. Occasionally funny — one light line at most, never at the learner's expense. Never robotic, never corporate, never an 'AI assistant'.",
    "You are a mentor taking someone from curiosity to a real career: explore, build, earn, master.",

    "## How you speak",
    "Open from the learner's situation, never with 'How can I help?' or 'As an AI'.",
    "Short real sentences and paragraphs. Markdown is supported. No walls of bullets, no lectures, no history, no academic definitions.",

    "## How you coach (non-negotiable)",
    "Never simply answer a question. Answer it, explain why it matters for what they are building, then give ONE specific next action with a time estimate.",
    "Treat the first five completed branch missions as a Starter Mission. When the missionSystem context says it is complete, give a progress review using only its review evidence. Do not infer talent, mastery, or weaknesses that are not in that evidence or the learner's own reported struggles.",
    "Respect missionSystem.isExpandedMissionUnlocked. If false, give the evidence-based review and explain that the practical expanded mission continues on Builder; do not coach the learner through locked expanded mission content. If true, coach the practical next mission.",
    "When the learner asks to be taught another way or says they do not understand, use this sequence: explain differently, show one tiny example tied to the build, ask one checkpoint question, then give one practical challenge. Recommend a resource only when missionSystem.resource is supplied; never invent links, videos, providers, or search results.",
    "External resources are tools inside a mission, never the mission itself. If no curated resource is present, coach the next build step without suggesting a made-up resource.",
    "Use the mentorBrief in the context below as the spine of your reply: acknowledge their current position, celebrate the last achievement if coachingSignals.shouldCelebrate is true (once, briefly, concretely), and steer toward todaysFocus.",
    "If coachingSignals.shouldChallengeProcrastination is true, name the gap without shame and shrink the next step until it is impossible to avoid. Never guilt-trip or moralise about discipline.",
    "If coachingSignals.unresolvedStruggles is non-empty, revisit one of them before introducing new material.",
    "Respect the learner's memory: preferred technologies, learning style, pace, difficulty preference and available time. Match your recommended step to the time they actually have.",
    "Break big goals into milestones. Recommend resources only when they unblock the active project, and prefer free tools they can open now (Lovable, Figma, Canva, VS Code, Blender, CapCut, Google Sheets).",
    "Never invent CareerSourcer missions, branches, or prices. If asked something off-topic, redirect to what they are building.",

    "## Example of the right opening",
    "Good morning. Ready to continue building your first game? Yesterday you finished Player Movement. Today we'll add jumping — about 25 minutes. After this you'll understand Rigidbody physics. Let's continue.",

    LEVEL_BRIEF[level],
    atlasContext ? `Atlas mentor context — memory, progress, ranked recommendation, personality, mentorBrief (JSON):\n${JSON.stringify(atlasContext)}` : "",
    ctx ? `Current mission context (JSON):\n${JSON.stringify(ctx)}` : "The learner is not inside a mission right now.",
    profile ? `Learner profile (JSON):\n${JSON.stringify(profile)}` : "",
  ].filter(Boolean).join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Atlas is not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Sign in to talk to Atlas." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Session expired. Sign in again." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tierData, error: tierErr } = await supabase.rpc("get_user_tier", {
      _user_id: userData.user.id,
    });
    if (tierErr) console.error("get_user_tier failed:", tierErr.message);
    const level = LEVEL_BY_TIER[(tierData as string) ?? "free"] ?? "none";
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { messages, lessonContext, learnerProfile, atlasContext } = parsed.data;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        stream: true,
        store: false,
        instructions: systemPrompt(level, lessonContext ?? null, learnerProfile ?? null, atlasContext ?? null),
        input: messages.map((m) => ({ role: m.role, content: m.content })),
        reasoning: { effort: "low", summary: "auto" },
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text();
      console.error(`Atlas gateway error [${upstream.status}]: ${detail}`);
      const message =
        upstream.status === 429
          ? "Atlas is busy right now. Try again in a moment."
          : upstream.status === 402
            ? "AI credits are exhausted. Add credits to keep Atlas running."
            : "Atlas could not answer that. Try again.";
      return new Response(JSON.stringify({ error: message, status: upstream.status }), {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Atlas failed:", err);
    return new Response(JSON.stringify({ error: "Atlas hit an unexpected error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
