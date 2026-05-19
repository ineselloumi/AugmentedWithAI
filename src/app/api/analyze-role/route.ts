import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/services/llm";
import { getCached, setCached } from "@/lib/roleCache";

export async function POST(req: NextRequest) {
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

  const cached = getCached(trimmedRole);
  if (cached) return NextResponse.json(cached);

  try {
    const provider = getProvider();
    const result = await provider.analyzeRole(trimmedRole);
    setCached(trimmedRole, result);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
