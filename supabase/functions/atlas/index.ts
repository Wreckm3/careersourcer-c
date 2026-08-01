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

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  lessonContext: LessonContextSchema.nullish(),
});

type AtlasLevel = "none" | "lite" | "smart" | "pro";

const LEVEL_BY_TIER: Record<string, AtlasLevel> = {
  free: "none",
  builder: "lite",
  creator: "smart",
  visionary: "pro",
};

const LEVEL_BRIEF: Record<Exclude<AtlasLevel, "none">, string> = {
  lite:
    "You are Atlas Lite. Keep replies under 120 words. Give one concrete next action, one tool suggestion, and stop.",
  smart:
    "You are Atlas. Keep replies under 200 words. You may review the learner's project description, point out the single weakest part, and suggest one improvement plus one stretch idea.",
  pro:
    "You are Atlas Pro, a long-term growth mentor. Up to 320 words. Connect today's mission to a 3-month roadmap, portfolio quality, and how this becomes income or opportunity.",
};

function systemPrompt(level: Exclude<AtlasLevel, "none">, ctx: unknown) {
  return [
    "You are Atlas, the mentor inside CareerSourcer — a project-first learning platform for teenagers and beginners.",
    "Principles: every answer moves the learner toward something BUILT. No lecture, no history, no academic definitions.",
    "Be direct, warm, and specific. Use short paragraphs or tight bullet lists. Markdown is supported.",
    "Recommend free tools the learner can actually open now (Lovable, Figma, Canva, VS Code, Blender, CapCut, Google Sheets).",
    "Never invent CareerSourcer lessons or prices. If asked something off-topic, redirect to what they are building.",
    LEVEL_BRIEF[level],
    ctx ? `Current mission context (JSON):\n${JSON.stringify(ctx)}` : "The learner is not inside a mission right now.",
  ].join("\n\n");
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
    if (level === "none") {
      return new Response(
        JSON.stringify({ error: "Atlas is available on the Builder plan and above.", upgrade: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { messages, lessonContext } = parsed.data;

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
        instructions: systemPrompt(level, lessonContext ?? null),
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
