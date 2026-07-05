import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "create_task",
  title: "Create task",
  description: "Create a task for the signed-in user.",
  inputSchema: {
    title: z.string().trim().min(1),
    description: z.string().optional(),
    category: z.string().optional().describe("Task category e.g. Development, Design, Video, Ads"),
    date: z.string().describe("Date in YYYY-MM-DD"),
    target_minutes: z.number().int().positive().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("tasks")
      .insert({
        user_id: ctx.getUserId()!,
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? "Development",
        date: input.date,
        target_minutes: input.target_minutes ?? null,
        status: "Not Started",
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { task: data } };
  },
});
