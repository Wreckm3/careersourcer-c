declare const process: { env: Record<string, string | undefined> };
import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "get_my_progress",
  title: "Get my progress",
  description:
    "Get the signed-in user's CareerSourcer progress: selected path, completed sessions, current streak, and streak days.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("user_progress")
      .select("selected_path, completed_sessions, streak_current, streak_last_date, streak_days")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const progress = data ?? {
      selected_path: null,
      completed_sessions: [],
      streak_current: 0,
      streak_last_date: null,
      streak_days: [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(progress, null, 2) }],
      structuredContent: { progress },
    };
  },
});
