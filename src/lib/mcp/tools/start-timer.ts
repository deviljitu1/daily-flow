import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { runTool } from "../tool-runtime";

export default defineTool({
  name: "start_timer",
  title: "Start timer",
  description: "Start a time session on one of the signed-in user's tasks and set it to In Progress.",
  inputSchema: { task_id: z.string().uuid() },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx: ToolContext) => runTool("start_timer", input, ctx, async ({ task_id }, runtime) => {
      const closeOtherSessions = await runtime.client
        .from("time_sessions")
        .update({ end_time: Date.now() })
        .eq("created_by", runtime.userId)
        .is("end_time", null)
        .select();
      runtime.logDbResult("start_timer.close_existing", closeOtherSessions);
      if (closeOtherSessions.error) return runtime.fail(closeOtherSessions.error.message);

      const result = await runtime.client
        .from("time_sessions")
        .insert({ task_id, start_time: Date.now(), created_by: runtime.userId })
        .select()
        .single();
      runtime.logDbResult("start_timer.insert", result);
        
      if (result.error) {
        return runtime.fail(result.error.message);
      }
      
      const updateResult = await runtime.client
        .from("tasks")
        .update({ status: "In Progress" })
        .eq("id", task_id)
        .eq("user_id", runtime.userId)
        .select()
        .single();
      runtime.logDbResult("start_timer.update_task", updateResult);
      if (updateResult.error) return runtime.fail(updateResult.error.message);
      
      return runtime.ok("Started timer", result.data, { session: result.data, task: updateResult.data });
    }),
});
