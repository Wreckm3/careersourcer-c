import { createClient } from "npm:@supabase/supabase-js@2.106.1";
import { handleResearchRequest } from "../_shared/atlas/researchService.ts";

Deno.serve(request => handleResearchRequest(request, {
  enabled: Deno.env.get("ATLAS_CURATED_RESEARCH_ENABLED") === "true",
  allowedOrigins: ["https://www.careersourcer.co.ke", "https://careersourcer.co.ke"],
  now: Date.now,
  authorize: async token => {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anon) throw new Error("Missing auth configuration");
    const client = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) return "unauthenticated";
    const grant = await client.rpc("has_founder_atlas_entitlement");
    if (grant.error) throw new Error("Founder authorization unavailable");
    return grant.data === true ? "allowed" : "forbidden";
  },
}));
