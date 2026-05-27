// Sanitize errors so we don't leak stack traces, file paths, or
// internal config to clients. Log the real error server-side, return
// a generic message.

import { NextResponse } from "next/server";

export function serverError(context: string, err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${context}]`, message);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
