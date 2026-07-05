import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyTasks from "./tools/list-my-tasks";
import createTask from "./tools/create-task";
import completeTask from "./tools/complete-task";
import startTimer from "./tools/start-timer";
import stopTimer from "./tools/stop-timer";
import teamActivity from "./tools/team-activity";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "getweb-task-mcp",
  title: "GetWeb Task",
  version: "0.1.0",
  instructions:
    "Tools for the GetWeb Task work-tracker app. Manage your own tasks and time sessions. Admins can also read team activity. Each user connects with their own account via OAuth; all reads and writes respect app permissions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyTasks, createTask, completeTask, startTimer, stopTimer, teamActivity],
});
