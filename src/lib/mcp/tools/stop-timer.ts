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
  name: "stop_timer",
  title: "Stop timer",
  description: "Stop the currently open time session on the signed-in user's task.",
  inputSchema: { task_id: z.string().uuid() },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    try {
      const { task_id } = input;
      console.log(`[Tool] stop_timer invoked with input:`, JSON.stringify(input));
      if (!ctx.isAuthenticated()) {
        console.warn(`[Tool] stop_timer authentication failed.`);
        return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
      }
      
      const userId = ctx.getUserId()!;
      console.log(`[Tool] stop_timer authenticated user ID:`, userId);

      const { data, error } = await sb(ctx)
        .from("time_sessions")
        .update({ end_time: new Date().toISOString() })
        .eq("task_id", task_id)
        .is("end_time", null)
        .select();
        
      if (error) {
        console.error(`[Tool] stop_timer Supabase query error:`, error);
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      console.log(`[Tool] stop_timer execution successful.`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { sessions: data } };
    } catch (err) {
      console.error(`[Tool] stop_timer unhandled exception:`, err);
      return {
        isError: true,
        content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }]
      };
    }
  },
});
