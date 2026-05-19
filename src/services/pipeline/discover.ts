import type { DiscoveryItem } from "./types";

const GROK_MODEL = "grok-4-0709";

function getSinceDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

function buildDiscoveryPrompt(sinceDate: string): string {
  return `You are a research assistant. Your ONLY job right now is to FIND real content — not to analyze, synthesize, or editorialize. Use x_search and web_search aggressively.

Search X (Twitter) AND the web for AI tools, models, frameworks, and significant releases that have been trending since ${sinceDate}. Run at least 10 different searches with varied queries, mixing X searches and web searches:
- x_search: "new AI tool since:${sinceDate}"
- x_search: "AI model release since:${sinceDate}"
- x_search: "AI agent since:${sinceDate}"
- x_search: "AI coding tool since:${sinceDate}"
- x_search: "open source AI since:${sinceDate}"
- web_search: "new AI tools released this week ${sinceDate}"
- web_search: "AI model launch announcement ${sinceDate}"
- web_search: "trending AI tools May 2025"
- web_search: "best new AI releases this week"
- web_search: site:github.com AI tool released after:${sinceDate}

**Hard rules:**
- ONLY include content actually found via search — no training data, no guessing.
- REJECT items backed only by a single tweet with an unverifiable claim (e.g. "Company X is hiding a secret model"). Every included item must have corroborating signals: multiple mentions, a web article, a GitHub repo, or an official announcement page.
- Each item MUST include at least one non-tweet URL (article, GitHub repo, product page, official announcement). Tweets alone are not sufficient.
- Use the exact product/model name from the source: "Claude Sonnet 4" not "Claude 4", "GPT-4o" not "ChatGPT", "Gemini 2.5 Pro" not "Gemini".
- Include ONLY items from since:${sinceDate}. Reject anything older.
- Aim for 10–15 items. If you cannot find that many real verified items, return fewer — do not fabricate.
- raw_quote must be a verbatim excerpt from a real post or article, not paraphrased.

**What qualifies:**
1. New tool/model/framework announced or released since ${sinceDate} — with an official page or GitHub
2. Existing tool with a major update since ${sinceDate} — with a changelog, blog post, or announcement
3. Older tool suddenly getting heavy discussion since ${sinceDate} — cite the spike with multiple sources

**What does NOT qualify:**
- Single-tweet claims about unreleased or secret models
- Items with no corroborating web presence
- Anything you cannot find a non-Twitter URL for

**For each item, also search for:**
- The official announcement URL (company blog, press release, GitHub release, product page)
- The publication/announcement date (be precise: "2026-05-03", not just "this week")
- Tweets about it from known AI voices: @karpathy, @sama, @ylecun, @demishassabis, @gdb, @drjimfan, @aidan_mclau, @swyx, @hardmaru, @emollick, @fchollet, @goodfellow_ian, or similar credible researchers/engineers. These are a bonus — only include if you actually find one, don't invent them.

**Category options:** Coding Agent, Image/Video Generation, World Models, Reasoning Model, Multimodal, Design Tools, Voice & Audio, Search & Research, Data & Analytics, Agents & Automation, Developer Tools, Enterprise Platform, Consumer App, Real-time Video

Return ONLY valid JSON — no markdown, no explanation:
{
  "items": [
    {
      "name": "<exact product or model name>",
      "category": "<one of the categories above>",
      "publishedAt": "<YYYY-MM-DD of announcement, or null if unknown>",
      "announcementUrl": "<official blog/press release/GitHub/product URL, or null>",
      "authorityTweets": ["<tweet URL from a known AI voice, only if you actually found one>"],
      "urls": ["<announcementUrl first>", "<authority tweet URLs>", "<any other supporting URLs>"],
      "raw_quote": "<verbatim excerpt from a real post or article you found>"
    }
  ]
}`;
}

function extractText(output: unknown[]): string | null {
  const message = output?.find(
    (item): item is { type: string; content: { type: string; text: string }[] } =>
      typeof item === "object" &&
      item !== null &&
      (item as { type: string }).type === "message"
  );
  return message?.content?.[0]?.text ?? null;
}

export async function runDiscovery(): Promise<DiscoveryItem[]> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("GROK_API_KEY is not set");

  const sinceDate = getSinceDate();

  const res = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      instructions:
        "You are a research assistant. Search before you answer. Return ONLY valid JSON with no markdown fences.",
      input: buildDiscoveryPrompt(sinceDate),
      tools: [{ type: "web_search" }, { type: "x_search" }],
      temperature: 0,
      text: { format: { type: "json_object" } },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Grok discovery API error: ${err}`);
  }

  const raw = await res.json();
  const text = extractText(raw.output);
  if (!text) throw new Error("No text in Grok discovery response");

  let parsed: { items: DiscoveryItem[] };
  try {
    parsed = JSON.parse(text) as { items: DiscoveryItem[] };
  } catch {
    throw new Error(`Grok discovery returned invalid JSON: ${text.slice(0, 200)}`);
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error("Grok discovery response missing items array");
  }

  // Basic validation — drop items without a name or any URLs
  return parsed.items.filter(
    (item) =>
      typeof item.name === "string" &&
      item.name.trim() !== "" &&
      Array.isArray(item.urls) &&
      item.urls.length > 0
  );
}
