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
  name: "start_timer",
  title: "Start timer",
  description: "Start a time session on one of the signed-in user's tasks and set it to In Progress.",
  inputSchema: { task_id: z.string().uuid() },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    try {
      const { task_id } = input;
      console.log(`[Tool] start_timer invoked with input:`, JSON.stringify(input));
      if (!ctx.isAuthenticated()) {
        console.warn(`[Tool] start_timer authentication failed.`);
        return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
      }
      
      const userId = ctx.getUserId()!;
      console.log(`[Tool] start_timer authenticated user ID:`, userId);

      const client = sb(ctx);
      const { data, error } = await client
        .from("time_sessions")
        .insert({ task_id, start_time: new Date().toISOString(), created_by: userId })
        .select()
        .single();
        
      if (error) {
        console.error(`[Tool] start_timer Supabase query error:`, error);
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      
      await client.from("tasks").update({ status: "In Progress" }).eq("id", task_id).eq("user_id", userId);
      
      console.log(`[Tool] start_timer execution successful.`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { session: data } };
    } catch (err) {
      console.error(`[Tool] start_timer unhandled exception:`, err);
      return {
        isError: true,
        content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }]
      };
    }
  },
});
