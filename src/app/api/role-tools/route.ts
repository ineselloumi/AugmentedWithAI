import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/services/llm";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { role, taskTitle, taskDescription, hasChatGPT, hasClaude } = body as Record<string, unknown>;

  if (!role || typeof role !== "string" || role.trim().length === 0) {
    return NextResponse.json({ error: "role is required" }, { status: 400 });
  }
  if (!taskTitle || typeof taskTitle !== "string") {
    return NextResponse.json({ error: "taskTitle is required" }, { status: 400 });
  }
  if (!taskDescription || typeof taskDescription !== "string") {
    return NextResponse.json({ error: "taskDescription is required" }, { status: 400 });
  }

  try {
    const provider = getProvider();
    const result = await provider.getToolsForTask(
      role.trim(),
      taskTitle.trim(),
      taskDescription.trim(),
      { hasChatGPT: hasChatGPT === true, hasClaude: hasClaude === true }
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
