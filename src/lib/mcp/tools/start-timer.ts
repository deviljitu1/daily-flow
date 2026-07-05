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
  name: "start_timer",
  title: "Start timer",
  description: "Start a time session on one of the signed-in user's tasks and set it to In Progress.",
  inputSchema: { task_id: z.string().uuid() },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ task_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = sb(ctx);
    const userId = ctx.getUserId()!;
    const { data, error } = await client
      .from("time_sessions")
      .insert({ task_id, start_time: new Date().toISOString(), created_by: userId })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    await client.from("tasks").update({ status: "In Progress" }).eq("id", task_id).eq("user_id", userId);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { session: data } };
  },
});
