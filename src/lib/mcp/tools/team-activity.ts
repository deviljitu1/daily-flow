import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function sb(ctx: ToolContext) {
  const supabaseUrl = typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_URL") : process.env.SUPABASE_URL;
  const supabaseKey = typeof Deno !== "undefined" ? (Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")) : (process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY);

  return createClient(supabaseUrl!, supabaseKey!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "team_activity",
  title: "Team activity snapshot",
  description: "Get the current team activity snapshot (admin only). Returns each member's active task and today's todo/progress/completed lists.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    try {
      console.log(`[Tool] team_activity invoked with input:`, JSON.stringify(input));
      if (!ctx.isAuthenticated()) {
        console.warn(`[Tool] team_activity authentication failed.`);
        return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
      }
      
      const userId = ctx.getUserId()!;
      console.log(`[Tool] team_activity authenticated user ID:`, userId);

      const { data, error } = await sb(ctx).rpc("get_team_activity");
      
      if (error) {
        console.error(`[Tool] team_activity Supabase query error:`, error);
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      console.log(`[Tool] team_activity execution successful.`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { activity: data } };
    } catch (err) {
      console.error(`[Tool] team_activity unhandled exception:`, err);
      return {
        isError: true,
        content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }]
      };
    }
  },
});
