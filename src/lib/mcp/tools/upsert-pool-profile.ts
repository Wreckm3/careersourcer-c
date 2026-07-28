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
  name: "upsert_my_pool_profile",
  title: "Create or update my pool profile",
  description:
    "Create or update the signed-in user's collaboration pool profile so others can find them.",
  inputSchema: {
    display_name: z.string().min(1).max(60),
    headline: z.string().max(120).nullable(),
    bio: z.string().max(600).nullable(),
    branches: z.array(z.string()).describe("Branch ids the user is interested in."),
    looking_for: z.string().max(300).nullable(),
    contact_link: z.string().max(300).nullable().describe("URL, email, or handle."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("pool_profiles")
      .upsert(
        {
          user_id: ctx.getUserId(),
          display_name: input.display_name,
          headline: input.headline,
          bio: input.bio,
          branches: input.branches,
          looking_for: input.looking_for,
          contact_link: input.contact_link,
        },
        { onConflict: "user_id" },
      )
      .select()
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: "Pool profile saved." }],
      structuredContent: { profile: data },
    };
  },
});
