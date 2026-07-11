import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

declare const Deno: { env: { get: (name: string) => string | undefined } } | undefined;

type ToolHandlerResult = {
  content?: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

type ToolHandler<TInput> = (input: TInput, runtime: ToolRuntime) => Promise<ToolHandlerResult>;

export type ToolRuntime = {
  ctx: ToolContext;
  userId: string;
  userEmail: string | undefined;
  client: SupabaseClient;
  logDbResult: (operation: string, result: { data?: unknown; error?: unknown }) => void;
  ok: (label: string, data: unknown, structuredContent?: Record<string, unknown>) => ToolHandlerResult;
  fail: (message: string, details?: unknown) => ToolHandlerResult;
};

const readRuntimeEnv = (name: string) => {
  if (typeof Deno !== "undefined") return Deno.env.get(name) ?? undefined;
  if (typeof process !== "undefined") return process.env[name];
  return undefined;
};

const safeJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return `[unserializable: ${error instanceof Error ? error.message : String(error)}]`;
  }
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String((error as { message: unknown }).message);
  return String(error);
};

const errorStack = (error: unknown) => (error instanceof Error ? error.stack : undefined);

const getSupabaseConfig = () => {
  const supabaseUrl = readRuntimeEnv("SUPABASE_URL") ?? import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey =
    readRuntimeEnv("SUPABASE_PUBLISHABLE_KEY") ??
    readRuntimeEnv("SUPABASE_ANON_KEY") ??
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return { supabaseUrl, supabaseKey };
};

const createUserClient = (ctx: ToolContext) => {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("MCP backend configuration is missing the database URL or publishable key.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export async function runTool<TInput>(toolName: string, input: TInput, ctx: ToolContext, handler: ToolHandler<TInput>) {
  const startedAt = Date.now();
  try {
    console.log(`[MCP:${toolName}] request.received`, {
      input: safeJson(input),
      hasToken: Boolean(ctx.getToken()),
      tokenLength: ctx.getToken()?.length ?? 0,
      userId: ctx.getUserId(),
      userEmail: ctx.getUserEmail(),
      clientId: ctx.getClientId(),
      scopes: ctx.getScopes(),
    });

    if (!ctx.isAuthenticated() || !ctx.getToken() || !ctx.getUserId()) {
      console.warn(`[MCP:${toolName}] auth.failed`, { authenticated: ctx.isAuthenticated(), userId: ctx.getUserId() });
      return { content: [{ type: "text" as const, text: "Not authenticated" }], isError: true };
    }

    const client = createUserClient(ctx);
    const { data: userData, error: userError } = await client.auth.getUser(ctx.getToken());
    if (userError || !userData.user) {
      console.error(`[MCP:${toolName}] auth.getUser.failed`, {
        message: userError?.message,
        userId: ctx.getUserId(),
        userEmail: ctx.getUserEmail(),
      });
      return { content: [{ type: "text" as const, text: userError?.message ?? "Could not resolve authenticated user" }], isError: true };
    }

    const runtime: ToolRuntime = {
      ctx,
      userId: ctx.getUserId()!,
      userEmail: userData.user.email ?? ctx.getUserEmail(),
      client,
      logDbResult: (operation, result) => {
        console.log(`[MCP:${toolName}] db.${operation}`, {
          hasError: Boolean(result.error),
          error: result.error ? errorMessage(result.error) : undefined,
          data: result.error ? undefined : safeJson(result.data),
        });
      },
      ok: (label, data, structuredContent) => {
        const content = [{ type: "text" as const, text: `${label}:\n${safeJson(data)}` }];
        const response = { content, structuredContent };
        console.log(`[MCP:${toolName}] response.ok`, { durationMs: Date.now() - startedAt, label });
        return response;
      },
      fail: (message, details) => {
        console.error(`[MCP:${toolName}] response.error`, { durationMs: Date.now() - startedAt, message, details });
        return { content: [{ type: "text" as const, text: message }], isError: true };
      },
    };

    console.log(`[MCP:${toolName}] auth.ok`, { userId: runtime.userId, userEmail: runtime.userEmail });
    const result = await handler(input, runtime);
    console.log(`[MCP:${toolName}] response.returned`, { durationMs: Date.now() - startedAt, isError: Boolean(result.isError) });
    return result;
  } catch (error) {
    console.error(`[MCP:${toolName}] exception`, {
      durationMs: Date.now() - startedAt,
      message: errorMessage(error),
      stack: errorStack(error),
    });
    return { content: [{ type: "text" as const, text: errorMessage(error) }], isError: true };
  }
}
