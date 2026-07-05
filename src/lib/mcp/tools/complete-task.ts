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
  name: "complete_task",
  title: "Complete task",
  description: "Mark a task as Finished, stop any open timer, and optionally attach completion notes and a project link.",
  inputSchema: {
    task_id: z.string().uuid(),
    completion_notes: z.string().optional(),
    project_link: z.string().url().optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ task_id, completion_notes, project_link }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = sb(ctx);
    await client.from("time_sessions").update({ end_time: new Date().toISOString() }).eq("task_id", task_id).is("end_time", null);
    const updates: Record<string, unknown> = { status: "Finished" };
    if (completion_notes) updates.completion_notes = completion_notes;
    if (project_link) updates.project_link = project_link;
    const { data, error } = await client.from("tasks").update(updates).eq("id", task_id).eq("user_id", ctx.getUserId()!).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { task: data } };
  },
});
