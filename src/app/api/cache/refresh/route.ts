import { NextResponse } from "next/server";
import { getProvider } from "@/services/llm";
import { getCached, setCached } from "@/lib/roleCache";
import { getToolsCached, setToolsCached } from "@/lib/toolsCache";
import { ROLE_ALIASES } from "@/lib/roleAliases";

export const maxDuration = 300;

// Derive the unique set of canonical roles from the alias map
const CANONICAL_ROLES = [...new Set(Object.values(ROLE_ALIASES))];

async function refreshRole(role: string): Promise<{ role: string; tasks: number; tools: number; errors: string[] }> {
  const provider = getProvider();
  const errors: string[] = [];

  // Step 1: Refresh tasks — skip if already cached
  let analysis;
  const cachedAnalysis = await getCached(role);
  if (cachedAnalysis) {
    analysis = cachedAnalysis;
  } else {
    try {
      analysis = await provider.analyzeRole(role, "sonnet");
      await setCached(role, analysis);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`analyzeRole: ${msg}`);
      return { role, tasks: 0, tools: 0, errors };
    }
  }

  // Step 2: Refresh tools for each task sequentially — one call at a time
  // to stay well within Anthropic's token-per-minute rate limit.
  // Skip tasks that are already cached.
  const toolErrors: string[] = [];
  let toolsSucceeded = 0;

  for (const task of analysis.tasks) {
    const cachedTools = await getToolsCached(role, task.id);
    if (cachedTools) {
      toolsSucceeded++;
      continue;
    }
    try {
      const tools = await provider.getToolsForTask(role, task.title, task.description);
      await setToolsCached(role, task.id, tools);
      toolsSucceeded++;
    } catch (err) {
      toolErrors.push(`getToolsForTask: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { role, tasks: 1, tools: toolsSucceeded, errors: [...errors, ...toolErrors] };
}

export async function GET(req: Request) {
  // Auth check — fail closed if the secret isn't set.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cache/refresh] CRON_SECRET not configured — refusing request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  console.log(`[cache/refresh] Starting refresh of ${CANONICAL_ROLES.length} canonical roles`);

  // Refresh roles sequentially to avoid hitting Anthropic rate limits.
  // Tasks within each role still run in parallel (max 5 simultaneous calls).
  const results: PromiseSettledResult<{ role: string; tasks: number; tools: number; errors: string[] }>[] = [];
  for (const role of CANONICAL_ROLES) {
    results.push(await Promise.resolve(refreshRole(role)).then(
      (v) => ({ status: "fulfilled" as const, value: v }),
      (e) => ({ status: "rejected" as const, reason: e }),
    ));
  }

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
