import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { runTool } from "../tool-runtime";

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
  handler: async (input, ctx: ToolContext) => runTool("complete_task", input, ctx, async ({ task_id, completion_notes, project_link }, runtime) => {
      const stopResult = await runtime.client
        .from("time_sessions")
        .update({ end_time: Date.now() })
        .eq("task_id", task_id)
        .eq("created_by", runtime.userId)
        .is("end_time", null)
        .select();
      runtime.logDbResult("complete_task.stop_open_sessions", stopResult);
      if (stopResult.error) return runtime.fail(stopResult.error.message);
      
      const updates: Record<string, unknown> = { status: "Finished" };
      if (completion_notes) updates.completion_notes = completion_notes;
      if (project_link) updates.project_link = project_link;
      
      const result = await runtime.client
        .from("tasks")
        .update(updates)
        .eq("id", task_id)
        .eq("user_id", runtime.userId)
        .select()
        .single();
      runtime.logDbResult("complete_task.update", result);
      
      if (result.error) {
        return runtime.fail(result.error.message);
      }

      return runtime.ok("Completed task", result.data, { task: result.data, stopped_sessions: stopResult.data ?? [] });
    }),
});
