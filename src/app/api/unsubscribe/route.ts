import { supabase } from "@/lib/supabase";
import { removeSubscriber } from "@/services/pipeline/store";
import { verifyUnsubscribeToken } from "@/lib/unsubscribeToken";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { serverError } from "@/lib/errors";

// GET handles the click from the email link — we serve a confirmation page
// with a POST form. We don't act on GET because email link-previewers and
// scanners would auto-trigger it, and the actual unsubscribe is irreversible
// from the user's perspective without manual help.
//
// Both GET and POST verify the HMAC token so an attacker can't unsubscribe
// other people just by knowing their email.

function plainText(body: string, status: number): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/plain" } });
}

function htmlPage(body: string, status: number): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function performUnsubscribe(email: string): Promise<{ ok: boolean }> {
  if (supabase) {
    const { error } = await supabase.from("waitlist").delete().eq("email", email);
    if (error) {
      console.error("[unsubscribe] supabase delete error:", error.message);
      return { ok: false };
    }
  }
  // Also clear the file-based fallback store so local dev stays in sync.
  try {
    removeSubscriber(email);
  } catch (err) {
    console.error("[unsubscribe] file store removal error:", err);
  }
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export async function GET(req: Request) {
  const rl = rateLimit(req, { key: "unsubscribe", limit: 20, windowSec: 3600 });
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  const { searchParams } = new URL(req.url);
  const emailRaw = searchParams.get("email");
  const token = searchParams.get("token");

  if (!emailRaw || !token) {
    return plainText("Missing email or token parameter.", 400);
  }

  const email = emailRaw.trim().toLowerCase();
  if (!verifyUnsubscribeToken(email, token)) {
    return plainText("Invalid or expired unsubscribe link.", 403);
  }

  // Show a confirmation page with a POST form. Prevents email scanners from
  // automatically unsubscribing the user before they click.
  const safeEmail = escapeHtml(email);
  const safeToken = escapeHtml(token);
  return htmlPage(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Unsubscribe</title>
<meta name="robots" content="noindex,nofollow">
<style>body{background:#0a0a0a;color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;}
.card{max-width:420px;text-align:center;}h1{font-size:20px;margin:0 0 12px;}p{color:#9ca3af;font-size:14px;margin:0 0 24px;line-height:1.5;}
button{background:#7f1d1d;color:#fff;border:0;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;}
button:hover{background:#991b1b;}</style></head>
<body><div class="card">
<h1>Unsubscribe from augmentedwith.ai</h1>
<p>Click below to confirm unsubscribing <strong>${safeEmail}</strong>.</p>
<form method="POST" action="/api/unsubscribe">
<input type="hidden" name="email" value="${safeEmail}">
<input type="hidden" name="token" value="${safeToken}">
<button type="submit">Confirm unsubscribe</button>
</form></div></body></html>`,
    200,
  );
}

export async function POST(req: Request) {
  const rl = rateLimit(req, { key: "unsubscribe", limit: 20, windowSec: 3600 });
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  let email: string | null = null;
  let token: string | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      email = typeof body.email === "string" ? body.email : null;
      token = typeof body.token === "string" ? body.token : null;
    } else {
      const form = await req.formData();
      email = typeof form.get("email") === "string" ? (form.get("email") as string) : null;
      token = typeof form.get("token") === "string" ? (form.get("token") as string) : null;
    }
  } catch (err) {
    return serverError("unsubscribe", err);
  }

  if (!email || !token) {
    return plainText("Missing email or token parameter.", 400);
  }

  email = email.trim().toLowerCase();
  if (!verifyUnsubscribeToken(email, token)) {
    return plainText("Invalid or expired unsubscribe link.", 403);
  }

  const result = await performUnsubscribe(email);
  if (!result.ok) return plainText("Could not process unsubscribe. Please try again later.", 500);

  return htmlPage(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Unsubscribed</title>
<meta name="robots" content="noindex,nofollow">
<style>body{background:#0a0a0a;color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;}
.card{max-width:420px;text-align:center;}h1{font-size:20px;margin:0 0 12px;}p{color:#9ca3af;font-size:14px;margin:0;line-height:1.5;}</style></head>
<body><div class="card"><h1>You've been unsubscribed</h1><p>You won't receive any more emails from augmentedwith.ai.</p></div></body></html>`,
    200,
  );
}
