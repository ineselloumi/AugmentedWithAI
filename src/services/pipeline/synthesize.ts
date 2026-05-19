import Anthropic from "@anthropic-ai/sdk";
import type { VerifiedItem, ReportItem } from "./types";

const client = new Anthropic();
const MODEL = "claude-sonnet-4-5";

function buildSynthesisPrompt(item: VerifiedItem): string {
  const sourcesSummary = item.sources
    .map(
      (s) =>
        `- URL: ${s.url} (${s.status}${s.isTweet ? ", tweet" : ""})${s.title ? `\n  Title: ${s.title}` : ""}${s.content ? `\n  Excerpt: ${s.content}` : ""}`
    )
    .join("\n");

  const metaLines = [
    item.publishedAt ? `**Published:** ${item.publishedAt}` : null,
    item.announcementUrl ? `**Announcement URL:** ${item.announcementUrl}` : null,
    item.authorityTweets?.length
      ? `**Authority tweets:** ${item.authorityTweets.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are writing entries for a weekly AI newsletter aimed at curious, intelligent readers who follow AI but are NOT machine learning researchers. They care about what's new and why it matters — not about benchmark methodology or academic precision.

**Tool/Model:** ${item.name}
**Category:** ${item.category}
${metaLines}
**Raw quote from discovery:** ${item.raw_quote}
**Verification status:** ${item.status}

**Verified sources:**
${sourcesSummary}

Write a report item. Be specific and factual — only use information present in the sources. Do not invent numbers, quotes, or claims.

**Tone and language rules (critical):**
- Write for a smart non-specialist. Assume they use AI tools daily but don't read ML papers.
- Never use stock ticker symbols (e.g. $NVDA, $NOW, $MSFT). Always write the full company name.
- Translate jargon into plain impact: instead of "achieves 88.7% on SWE-bench" say "handles nearly 9 out of 10 real coding tasks correctly in independent tests"; instead of "beats inference latency targets" say "responds faster than previous versions"; instead of "outperforms on GSM8K" say "noticeably better at maths and logic problems".
- Keep benchmark numbers only if they're intuitive without context (e.g. "2x faster", "half the cost"). Drop opaque leaderboard scores unless you can explain them in one short clause.
- description: 2-3 sentences. Lead with what it does and what's concretely new. End with why a non-specialist should care.
- why_trending: 1-3 sentences. What's driving the buzz — an announcement, a viral demo, a notable person sharing it? Use @handles (e.g. @karpathy) not full names.
- evidence: 1-3 real quotes or observations from sources. Prefix with "Pro:" or "Con:" if opinions differ. Lightly clean quotes for readability (fix obvious typos, trim trailing filler) but do not alter the meaning.
- type: one of "New tool", "New release of existing", "Older tool surging"
- publishedAt: the announcement/release date from the metadata above, or null
- announcementUrl: the primary announcement URL from metadata, or null
- authorityTweets: authority tweet URLs from metadata (empty array if none)
- sources: the verified URLs that support this item

Return ONLY valid JSON:
{
  "name": "${item.name}",
  "category": "${item.category}",
  "type": "<New tool | New release of existing | Older tool surging>",
  "publishedAt": "<YYYY-MM-DD or null>",
  "announcementUrl": "<URL or null>",
  "authorityTweets": [],
  "description": "<2-3 plain-language sentences>",
  "why_trending": "<1-3 plain-language sentences, @handles where applicable>",
  "evidence": [
    { "text": "<quote or observation>", "author": "<@handle or source name>", "url": "<source URL or null>" }
  ],
  "verification_status": "${item.status}",
  "sources": [<verified URLs>]
}`;
}

async function synthesizeItem(item: VerifiedItem): Promise<ReportItem | null> {
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: buildSynthesisPrompt(item),
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : null;
    if (!text) return null;

    // Strip possible markdown fences
    const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    return JSON.parse(clean) as ReportItem;
  } catch (err) {
    console.error(`[synthesize] Failed for ${item.name}:`, err);
    return null;
  }
}

export async function runSynthesis(
  items: VerifiedItem[]
): Promise<{ reportItems: ReportItem[]; dropped: { name: string; reason: string }[] }> {
  // Run all synthesis calls in parallel (5 at a time)
  const CONCURRENCY = 5;
  const reportItems: ReportItem[] = [];
  const dropped: { name: string; reason: string }[] = [];

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((item) => synthesizeItem(item)));

    for (let j = 0; j < batch.length; j++) {
      const result = results[j];
      if (result) {
        reportItems.push(result);
      } else {
        dropped.push({ name: batch[j].name, reason: "synthesis failed or returned invalid JSON" });
      }
    }
  }

  return { reportItems, dropped };
}
