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
    try {
      console.log(`[Tool] create_task invoked with input:`, JSON.stringify(input));
      if (!ctx.isAuthenticated()) {
        console.warn(`[Tool] create_task authentication failed.`);
        return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
      }
      
      const userId = ctx.getUserId()!;
      console.log(`[Tool] create_task authenticated user ID:`, userId);

      const { data, error } = await sb(ctx)
        .from("tasks")
        .insert({
          user_id: userId,
          title: input.title,
          description: input.description ?? null,
          category: input.category ?? "Development",
          date: input.date,
          target_minutes: input.target_minutes ?? null,
          status: "Not Started",
        })
        .select()
        .single();

      if (error) {
        console.error(`[Tool] create_task Supabase query error:`, error);
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      console.log(`[Tool] create_task execution successful.`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { task: data } };
    } catch (err) {
      console.error(`[Tool] create_task unhandled exception:`, err);
      return {
        isError: true,
        content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }]
      };
    }
  },
});
