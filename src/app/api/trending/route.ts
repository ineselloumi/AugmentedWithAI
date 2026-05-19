import { NextResponse } from "next/server";
import type { TrendingResponse } from "@/types";

export const maxDuration = 120; // seconds — Grok search can take ~60s

const GROK_MODEL = "grok-4-0709";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cache: { data: TrendingResponse; cachedAt: number } | null = null;

function getSinceDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

function buildPrompt(sinceDate: string): string {
  return `You are an expert AI analyst focused on emerging tools and breakthroughs. You MUST use the x_search and web_search tools to find real, current data. Do NOT use your training data or generate fictional results — every item must come from actual posts or articles you find through search.

Search X (Twitter) and the web for the most relevant and trending AI tools, models, frameworks, platforms, and significant releases from the last 7 days (since ${sinceDate}).

**Time window**: STRICTLY only include content from since:${sinceDate}. Reject anything older.

**What qualifies as "trending" or noteworthy (rank by strength)**:
1. High engagement + mentions from credible tech voices (Andrej Karpathy, Yann LeCun, Elon Musk, Demis Hassabis, Dario Amodei, Emad Mostaque, Andrew Ng, Fei-Fei Li, researchers from OpenAI/Anthropic/Google DeepMind/xAI, top indie hackers, or well-known AI engineers).
2. Rapid discussion velocity or sudden spikes.
3. New tools, major new releases/updates with clear new capabilities, or older tools that are suddenly surging.

**Search strategy**: Run multiple searches — e.g. "new AI tools since:${sinceDate}", "AI model release since:${sinceDate}", "trending AI since:${sinceDate}". Prioritize posts from credible voices.

**Precise naming — this is mandatory**:
- Always use the exact, specific product or model name as it appears in official announcements or posts. Never use a brand name alone as a model name.
- AI models have specific version names: use "Claude Sonnet 4" or "Claude Opus 4" — never just "Claude 4". Use "GPT-4o" or "o3" — never just "ChatGPT". Use "Gemini 2.5 Pro" — never just "Gemini". If you are unsure of the exact model name, search for it before including it.
- If a release covers a whole family (e.g. Anthropic releases multiple models at once), name the most notable specific variant.

**Anti-hallucination — treat this as a hard rule**:
- Every benchmark number, engagement metric, and quote must come from a real post or article you found via search. Do not estimate or infer numbers.
- If you cannot find a real source for a claim, omit the claim entirely rather than approximating.
- If you cannot find enough verified items from this week, return fewer items — an empty list is better than fabricated entries.
- If a result feels generic or could have been written without searching (e.g. no specific tweet URL, no real engagement number), discard it and search again.

**Diverging opinions**: If a tool or model has both enthusiastic endorsements AND notable criticism (benchmarks questioned, limitations called out, safety concerns), explicitly capture both sides. Do not flatten controversy into consensus.

Aim for a healthy mix of models and applications/tools. Be substantive and specific — cite real post URLs, real engagement numbers, real quotes.

Return ONLY valid JSON, no markdown, no explanation, matching this exact schema:
{
  "items": [
    {
      "name": "<tool or model name>",
      "category": "<e.g. Coding Agent, Image/Video Generation, World Models, Model, Reasoning Model, Multimodal, Design Tools, Voice & Audio, Search & Research, Data & Analytics, Agents & Automation, Developer Tools, Enterprise Platform, Consumer App>",
      "type": "<New tool | New release of existing | Older tool surging>",
      "description": "<2-3 sentences: what it is, what's specifically new or notable, concrete capabilities or benchmarks>",
      "why_trending": "<specific reasons for trending. When mentioning people, always use their @handle (e.g. @sama, @karpathy) not their full name, so they can be hyperlinked. Include engagement numbers where available.>",
      "evidence": [
        {
          "text": "<quote or concrete observation — prefix with 'Pro:' or 'Con:' if opinions are split>",
          "author": "<@handle of the person who said it, e.g. @karpathy>",
          "url": "<direct URL to the specific X post where this was said — must be a real URL you found, or null if not available>"
        }
      ],
      "links": ["<real X post URL, product page, GitHub, etc — must be real URLs you found>"]
    }
  ],
  "trends_summary": "<max 40 words highlighting the dominant theme this week>"
}`;
}

function extractText(output: unknown[]): string | null {
  const message = output?.find(
    (item): item is { type: string; content: { type: string; text: string }[] } =>
      typeof item === "object" && item !== null && (item as { type: string }).type === "message"
  );
  return message?.content?.[0]?.text ?? null;
}

export async function GET() {
  if (cache && Date.now() - cache.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROK_API_KEY is not set" }, { status: 500 });
  }

  const sinceDate = getSinceDate();

  const res = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      instructions: "You are an expert AI analyst. You MUST search X and the web before answering — never fabricate results. Return ONLY valid JSON with no markdown fences.",
      input: buildPrompt(sinceDate),
      tools: [{ type: "web_search" }, { type: "x_search" }],
      temperature: 0.3,
      text: { format: { type: "json_object" } },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `Grok API error: ${err}` }, { status: 500 });
  }

  const raw = await res.json();

  const text = extractText(raw.output);
  if (!text) {
    return NextResponse.json({ error: "No text in Grok response" }, { status: 500 });
  }

  let parsed: TrendingResponse;
  try {
    parsed = JSON.parse(text) as TrendingResponse;
  } catch {
    return NextResponse.json({ error: "Grok returned invalid JSON" }, { status: 500 });
  }

  cache = { data: parsed, cachedAt: Date.now() };
  return NextResponse.json(parsed);
}
