import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { runTool } from "../tool-runtime";

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
  handler: async (input, ctx: ToolContext) => runTool("create_task", input, ctx, async (args, runtime) => {
      const result = await runtime.client
        .from("tasks")
        .insert({
          user_id: runtime.userId,
          title: args.title,
          description: args.description ?? null,
          category: args.category ?? "Development",
          date: args.date,
          target_minutes: args.target_minutes ?? null,
          status: "Not Started",
        })
        .select()
        .single();
      runtime.logDbResult("create_task.insert", result);

      if (result.error) {
        return runtime.fail(result.error.message);
      }

      return runtime.ok("Created task", result.data, { task: result.data });
    }),
});
