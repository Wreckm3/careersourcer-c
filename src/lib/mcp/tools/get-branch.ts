import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { categories } from "@/data/curriculum";

export default defineTool({
  name: "get_branch",
  title: "Get branch details",
  description:
    "Get a branch (learning track) with its full lesson list — titles, intros, video URLs, and challenges.",
  inputSchema: {
    categoryId: z.string().describe("Category id, e.g. 'technology'."),
    branchId: z.string().describe("Branch id, e.g. 'web-development'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ categoryId, branchId }) => {
    const category = categories.find((c) => c.id === categoryId);
    const branch = category?.branches.find((b) => b.id === branchId);
    if (!branch) {
      return {
        content: [{ type: "text", text: `Branch not found: ${categoryId}/${branchId}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(branch, null, 2) }],
      structuredContent: { branch },
    };
  },
});
