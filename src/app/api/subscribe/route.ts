import { NextResponse } from "next/server";
import { addSubscriber } from "@/services/pipeline/store";

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const added = addSubscriber(email);
  if (!added) {
    return NextResponse.json({ ok: true, alreadySubscribed: true });
  }

  return NextResponse.json({ ok: true, alreadySubscribed: false });
}
