declare const process: { env: Record<string, string | undefined> };
import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

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
  name: "search_pool",
  title: "Search collaboration pool",
  description:
    "Search the CareerSourcer collaboration pool for other users. Optionally filter by branch id (e.g. 'web-development') or a free-text query matched against display name, headline, and bio.",
  inputSchema: {
    branch: z.string().nullable().describe("Optional branch id to filter by (e.g. 'game-development')."),
    query: z.string().nullable().describe("Optional free-text search over name/headline/bio."),
    limit: z.number().int().min(1).max(50).nullable().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ branch, query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("pool_profiles")
      .select("user_id, display_name, headline, bio, branches, looking_for, contact_link, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (branch) q = q.contains("branches", [branch]);
    if (query) q = q.or(`display_name.ilike.%${query}%,headline.ilike.%${query}%,bio.ilike.%${query}%`);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { profiles: data ?? [] },
    };
  },
});
