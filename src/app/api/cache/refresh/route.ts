import { NextResponse } from "next/server";
import { getProvider } from "@/services/llm";
import { setCached } from "@/lib/roleCache";
import { setToolsCached } from "@/lib/toolsCache";
import { ROLE_ALIASES } from "@/lib/roleAliases";

export const maxDuration = 300;

// Derive the unique set of canonical roles from the alias map
const CANONICAL_ROLES = [...new Set(Object.values(ROLE_ALIASES))];

async function refreshRole(role: string): Promise<{ role: string; tasks: number; tools: number; errors: string[] }> {
  const provider = getProvider();
  const errors: string[] = [];

  // Step 1: Refresh tasks
  let analysis;
  try {
    analysis = await provider.analyzeRole(role, "sonnet");
    await setCached(role, analysis);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`analyzeRole: ${msg}`);
    return { role, tasks: 0, tools: 0, errors };
  }

  // Step 2: Refresh tools for each task in parallel
  const toolResults = await Promise.allSettled(
    analysis.tasks.map(async (task) => {
      const tools = await provider.getToolsForTask(role, task.title, task.description);
      await setToolsCached(role, task.id, tools);
    })
  );

  const toolErrors = toolResults
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => `getToolsForTask: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);

  const toolsSucceeded = toolResults.filter((r) => r.status === "fulfilled").length;

  return { role, tasks: 1, tools: toolsSucceeded, errors: [...errors, ...toolErrors] };
}

export async function GET(req: Request) {
  // Auth check
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  console.log(`[cache/refresh] Starting refresh of ${CANONICAL_ROLES.length} canonical roles`);

  // Refresh all roles in parallel
  const results = await Promise.allSettled(
    CANONICAL_ROLES.map((role) => refreshRole(role))
  );

  const summary = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { role: "unknown", tasks: 0, tools: 0, errors: [String(r.reason)] }
  );

  const totalTasks = summary.reduce((n, r) => n + r.tasks, 0);
  const totalTools = summary.reduce((n, r) => n + r.tools, 0);
  const totalErrors = summary.flatMap((r) => r.errors);

  console.log(`[cache/refresh] Done. roles=${CANONICAL_ROLES.length} tasks=${totalTasks} tools=${totalTools} errors=${totalErrors.length}`);

  return NextResponse.json({
    ok: true,
    roles: CANONICAL_ROLES.length,
    tasksRefreshed: totalTasks,
    toolsRefreshed: totalTools,
    errors: totalErrors,
  });
}
