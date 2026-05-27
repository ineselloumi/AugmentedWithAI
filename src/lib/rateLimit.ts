// In-memory per-IP rate limiter. Scoped to a single Vercel instance —
// Vercel keeps lambdas warm, so one bursty attacker from one IP gets throttled.
// For a stronger distributed guarantee, swap the Map for Upstash Redis.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function rateLimit(
  req: Request,
  opts: { key: string; limit: number; windowSec: number },
): RateLimitResult {
  const ip = getClientIp(req);
  const bucketKey = `${opts.key}:${ip}`;
  const now = Date.now();
  const windowMs = opts.windowSec * 1000;

  const existing = buckets.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      // Bound memory: evict expired entries when the map grows.
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }
    return { ok: true };
  }

  if (existing.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count++;
  return { ok: true };
}

export function rateLimitResponse(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}
