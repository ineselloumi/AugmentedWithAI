import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/services/llm";
import { getToolsCached, setToolsCached } from "@/lib/toolsCache";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { role, taskTitle, taskDescription, taskId } = body as Record<string, unknown>;

  if (!role || typeof role !== "string" || role.trim().length === 0) {
    return NextResponse.json({ error: "role is required" }, { status: 400 });
  }
  if (!taskTitle || typeof taskTitle !== "string") {
    return NextResponse.json({ error: "taskTitle is required" }, { status: 400 });
  }
  if (!taskDescription || typeof taskDescription !== "string") {
    return NextResponse.json({ error: "taskDescription is required" }, { status: 400 });
  }
  if (!taskId || typeof taskId !== "string") {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const trimmedRole = role.trim();

  // Check tools cache first
  const cached = await getToolsCached(trimmedRole, taskId);
  if (cached) return NextResponse.json(cached);

  // Cache miss — generate and store
  try {
    const provider = getProvider();
    const result = await provider.getToolsForTask(
      trimmedRole,
      taskTitle.trim(),
      taskDescription.trim(),
    );
    await setToolsCached(trimmedRole, taskId, result);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
