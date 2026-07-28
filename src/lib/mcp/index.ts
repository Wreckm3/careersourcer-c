import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCategories from "./tools/list-categories";
import getBranch from "./tools/get-branch";
import getMyProgress from "./tools/get-my-progress";
import searchPool from "./tools/search-pool";
import upsertPoolProfile from "./tools/upsert-pool-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "careersourcer-mcp",
  title: "CareerSourcer MCP",
  version: "0.1.0",
  instructions:
    "Tools for CareerSourcer: browse learning categories/branches, read the signed-in user's progress and streak, and search or update collaboration pool profiles.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCategories, getBranch, getMyProgress, searchPool, upsertPoolProfile],
});
