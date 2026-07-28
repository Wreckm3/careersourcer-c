import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { categories } from "../../../data/curriculum";

export default defineTool({
  name: "list_categories",
  title: "List learning categories",
  description:
    "List CareerSourcer's learning categories and their branches (id, title, featured status, lesson count).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const summary = categories.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      branches: c.branches.map((b) => ({
        id: b.id,
        title: b.title,
        tagline: b.tagline,
        featured: b.featured,
        lessons: b.lessons.length,
      })),
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: { categories: summary },
    };
  },
});

// silence unused import warning if tree-shaken
void z;
