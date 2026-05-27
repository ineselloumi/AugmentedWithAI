import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/services/llm";
import { getToolsCached, setToolsCached } from "@/lib/toolsCache";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { serverError } from "@/lib/errors";

export const maxDuration = 60;

const LIMITS = {
  role: 100,
  taskTitle: 200,
  taskDescription: 1000,
  taskId: 100,
};

function validString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0 || t.length > max) return null;
  return t;
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "role-tools", limit: 10, windowSec: 60 });
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { role, taskTitle, taskDescription, taskId } = body as Record<string, unknown>;

  const trimmedRole = validString(role, LIMITS.role);
  const trimmedTitle = validString(taskTitle, LIMITS.taskTitle);
  const trimmedDescription = validString(taskDescription, LIMITS.taskDescription);
  const trimmedTaskId = validString(taskId, LIMITS.taskId);

  if (!trimmedRole || !trimmedTitle || !trimmedDescription || !trimmedTaskId) {
    return NextResponse.json(
      { error: "Missing or invalid fields (role ≤100, taskTitle ≤200, taskDescription ≤1000, taskId ≤100)" },
      { status: 400 },
    );
  }

  const cached = await getToolsCached(trimmedRole, trimmedTaskId);
  if (cached) return NextResponse.json(cached);

  try {
    const provider = getProvider();
    const result = await provider.getToolsForTask(trimmedRole, trimmedTitle, trimmedDescription);
    await setToolsCached(trimmedRole, trimmedTaskId, result);
    return NextResponse.json(result);
  } catch (err) {
    return serverError("role-tools", err);
  }
}
