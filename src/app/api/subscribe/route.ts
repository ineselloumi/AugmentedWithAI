import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { addSubscriber } from "@/services/pipeline/store";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { serverError } from "@/lib/errors";

// TODO(security): pair this rate limit with a CAPTCHA (Cloudflare Turnstile or
// hCaptcha) before serious launch traffic — IP throttling alone won't stop a
// botnet from polluting the waitlist.
export async function POST(req: Request) {
  const rl = rateLimit(req, { key: "subscribe", limit: 5, windowSec: 3600 });
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  if (supabase) {
    try {
      const { error } = await supabase.from("waitlist").insert({ email });
      if (error) {
        if (error.code === "23505") {
          return NextResponse.json({ ok: true, alreadySubscribed: true });
        }
        return serverError("subscribe", error);
      }
      return NextResponse.json({ ok: true, alreadySubscribed: false });
    } catch (err) {
      return serverError("subscribe", err);
    }
  }

  // Fallback: file-based store (local dev without Supabase env vars)
  const added = addSubscriber(email);
  return NextResponse.json({ ok: true, alreadySubscribed: !added });
}
