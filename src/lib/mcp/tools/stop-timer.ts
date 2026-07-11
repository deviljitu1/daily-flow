import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { runTool } from "../tool-runtime";

export default defineTool({
  name: "stop_timer",
  title: "Stop timer",
  description: "Stop the currently open time session on the signed-in user's task.",
  inputSchema: { task_id: z.string().uuid() },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx: ToolContext) => runTool("stop_timer", input, ctx, async ({ task_id }, runtime) => {
      const result = await runtime.client
        .from("time_sessions")
        .update({ end_time: Date.now() })
        .eq("task_id", task_id)
        .eq("created_by", runtime.userId)
        .is("end_time", null)
        .select();
      runtime.logDbResult("stop_timer.update", result);
        
      if (result.error) {
        return runtime.fail(result.error.message);
      }

      return runtime.ok("Stopped timer", result.data ?? [], { sessions: result.data ?? [] });
    }),
});
