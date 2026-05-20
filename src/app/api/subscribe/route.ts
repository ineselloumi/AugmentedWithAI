import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

  if (supabase) {
    const { error } = await supabase.from("waitlist").insert({ email });
    if (error) {
      if (error.code === "23505") {
        // unique_violation — already on the waitlist
        return NextResponse.json({ ok: true, alreadySubscribed: true });
      }
      return NextResponse.json({ error: "Failed to save email" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, alreadySubscribed: false });
  }

  // Fallback: file-based store (local dev without Supabase env vars)
  const added = addSubscriber(email);
  return NextResponse.json({ ok: true, alreadySubscribed: !added });
}
