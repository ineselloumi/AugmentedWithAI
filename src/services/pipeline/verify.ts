import type { DiscoveryItem, VerifiedItem, VerifiedSource } from "./types";

const TWEET_RE = /^https?:\/\/(x\.com|twitter\.com)\/\w+\/status\/(\d{10,})/;
const TIMEOUT_MS = 8_000;

function isTweetUrl(url: string): boolean {
  return TWEET_RE.test(url);
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MultiplyMe-Pipeline/1.0; +https://multiplyme.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractReadableText(html: string): string {
  // Strip script/style blocks
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
  return text.slice(0, 600);
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  return match ? match[1].trim() : undefined;
}

async function verifyUrl(url: string): Promise<VerifiedSource> {
  const tweet = isTweetUrl(url);

  // For tweets we can't scrape content (X blocks bots), but we can validate the URL shape
  if (tweet) {
    return {
      url,
      status: "partial",
      isTweet: true,
    };
  }

  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!res.ok) {
      return { url, status: "failed", isTweet: false };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      // PDF or other non-HTML — count as verified (it loaded)
      return { url, status: "verified", isTweet: false };
    }

    const html = await res.text();
    const title = extractTitle(html);
    const content = extractReadableText(html);

    return {
      url,
      status: "verified",
      isTweet: false,
      title,
      content,
    };
  } catch {
    return { url, status: "failed", isTweet: false };
  }
}

export async function runVerification(
  items: DiscoveryItem[]
): Promise<VerifiedItem[]> {
  // Collect all unique URLs across all items
  const allUrls = [...new Set(items.flatMap((item) => item.urls))];

  // Verify all URLs in parallel (capped concurrency)
  const CONCURRENCY = 8;
  const urlResults = new Map<string, VerifiedSource>();

  for (let i = 0; i < allUrls.length; i += CONCURRENCY) {
    const batch = allUrls.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((url) => verifyUrl(url)));
    for (let j = 0; j < batch.length; j++) {
      urlResults.set(batch[j], results[j]);
    }
  }

  const verified: VerifiedItem[] = [];

  for (const item of items) {
    const sources = item.urls
      .map((url) => urlResults.get(url) ?? { url, status: "failed" as const, isTweet: false })
      .filter((s) => s.status !== "failed");

    if (sources.length === 0) {
      // All sources failed — drop this item
      continue;
    }

    // Drop items that have no web-verified source (tweet-only = not credible enough)
    const hasWebSource = sources.some((s) => s.status === "verified");
    const hasTweetOnly = sources.every((s) => s.isTweet);
    if (hasTweetOnly && !hasWebSource) {
      continue;
    }

    // If at least one source is fully verified (non-tweet, loaded), the item is "verified"
    const overallStatus = hasWebSource ? "verified" : "partial";

    verified.push({
      name: item.name,
      category: item.category,
      publishedAt: item.publishedAt,
      announcementUrl: item.announcementUrl,
      authorityTweets: item.authorityTweets,
      raw_quote: item.raw_quote,
      status: overallStatus,
      sources,
    });
  }

  return verified;
}
