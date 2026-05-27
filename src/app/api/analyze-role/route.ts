import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/services/llm";
import { getCached, setCached } from "@/lib/roleCache";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { serverError } from "@/lib/errors";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "analyze-role", limit: 10, windowSec: 60 });
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { role } = body as Record<string, unknown>;
  if (!role || typeof role !== "string" || role.trim().length === 0) {
    return NextResponse.json({ error: "role is required" }, { status: 400 });
  }
  if (role.trim().length > 100) {
    return NextResponse.json({ error: "role must be 100 characters or fewer" }, { status: 400 });
  }

  const trimmedRole = role.trim();

  const cached = await getCached(trimmedRole);
  if (cached) return NextResponse.json(cached);

  try {
    const provider = getProvider();
    const result = await provider.analyzeRole(trimmedRole, "haiku");
    await setCached(trimmedRole, result);
    return NextResponse.json(result);
  } catch (err) {
    return serverError("analyze-role", err);
  }
}
