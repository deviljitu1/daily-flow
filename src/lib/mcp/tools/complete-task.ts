import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  const supabaseUrl = typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_URL") : process.env.SUPABASE_URL;
  const supabaseKey = typeof Deno !== "undefined" ? (Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")) : (process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY);

  return createClient(supabaseUrl!, supabaseKey!, {
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
  handler: async (input, ctx) => {
    try {
      const { task_id, completion_notes, project_link } = input;
      console.log(`[Tool] complete_task invoked with input:`, JSON.stringify(input));
      if (!ctx.isAuthenticated()) {
        console.warn(`[Tool] complete_task authentication failed.`);
        return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
      }
      
      const userId = ctx.getUserId()!;
      console.log(`[Tool] complete_task authenticated user ID:`, userId);

      const client = sb(ctx);
      await client.from("time_sessions").update({ end_time: new Date().toISOString() }).eq("task_id", task_id).is("end_time", null);
      
      const updates: Record<string, unknown> = { status: "Finished" };
      if (completion_notes) updates.completion_notes = completion_notes;
      if (project_link) updates.project_link = project_link;
      
      const { data, error } = await client.from("tasks").update(updates).eq("id", task_id).eq("user_id", userId).select().single();
      
      if (error) {
        console.error(`[Tool] complete_task Supabase query error:`, error);
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      console.log(`[Tool] complete_task execution successful.`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { task: data } };
    } catch (err) {
      console.error(`[Tool] complete_task unhandled exception:`, err);
      return {
        isError: true,
        content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }]
      };
    }
  },
});
