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
  name: "list_my_tasks",
  title: "List my tasks",
  description: "List tasks belonging to the signed-in user. Optional filters by date (YYYY-MM-DD) or status.",
  inputSchema: {
    date: z.string().optional().describe("Filter by date (YYYY-MM-DD)"),
    status: z.enum(["Not Started", "In Progress", "Finished"]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    try {
      const { date, status, limit } = input;
      console.log(`[Tool] list_my_tasks invoked with input:`, JSON.stringify(input));
      if (!ctx.isAuthenticated()) {
        console.warn(`[Tool] list_my_tasks authentication failed.`);
        return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
      }
      
      const userId = ctx.getUserId()!;
      console.log(`[Tool] list_my_tasks authenticated user ID:`, userId);

      let q = sb(ctx).from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit ?? 50);
      if (date) q = q.eq("date", date);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;

      if (error) {
        console.error(`[Tool] list_my_tasks Supabase query error:`, error);
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      console.log(`[Tool] list_my_tasks execution successful.`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { tasks: data } };
    } catch (err) {
      console.error(`[Tool] list_my_tasks unhandled exception:`, err);
      return {
        isError: true,
        content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }]
      };
    }
  },
});
