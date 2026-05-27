import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import type { TrendingResponse } from "@/types";

export const maxDuration = 300;

const GROK_MODEL = "grok-4-0709";
const CLAUDE_MODEL = "claude-sonnet-4-6";

function getSinceDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

// --- Prompts ---

function buildGrokPrompt(sinceDate: string): string {
  return `You are an AI analyst monitoring X (Twitter) for AI discussions.

Search X for AI tools, models, frameworks, and platforms generating significant DISCUSSION in the last 7 days (since ${sinceDate}).

**Focus on discussion activity, not just new launches.** Include:
- Newly announced or launched AI tools/models
- Existing tools/models generating conversation this week due to new benchmarks, discoveries, controversies, or comparisons
- Community reactions, debates, or surging interest in any AI topic from the past 7 days

**Search strategy**: Run multiple x_search calls — try queries like "AI tools since:${sinceDate}", "AI model benchmark since:${sinceDate}", "AI trending since:${sinceDate}", "LLM release since:${sinceDate}".

**Precise naming**: Use exact product/model names (e.g. "Claude Sonnet 4" not "Claude 4", "GPT-4o" not "ChatGPT").

**Anti-hallucination**: Only include items you found real X posts for. If you cannot find real evidence, omit the item. Prefer 4 well-evidenced items over 8 vague ones.

Return ONLY valid JSON (no markdown fences):
{
  "items": [
    {
      "name": "<exact tool/model name>",
      "category": "<e.g. Model, Coding Agent, Image Generation, Reasoning Model, etc.>",
      "type": "<New launch | Existing tool surging | New benchmark/discovery>",
      "why_trending_on_x": "<specific reason with @handles and engagement numbers where available>",
      "evidence": [
        { "text": "<quote or observation>", "author": "<@handle>", "url": "<real tweet URL or null>" }
      ],
      "links": ["<real URLs>"]
    }
  ]
}`;
}

function buildClaudeWebPrompt(sinceDate: string): string {
  return `You are an AI analyst monitoring the broader web for AI discussions.

Search the web for AI tools, models, frameworks, and platforms generating significant discussion over the last 7 days (since ${sinceDate}). Cover Hacker News, tech blogs, GitHub releases, research publications, newsletters, Reddit (r/MachineLearning, r/LocalLLaMA), and major tech publications.

**Focus on discussion activity, not just new launches.** Include:
- Newly announced or launched AI tools/models
- Existing tools/models with new benchmark results, discoveries, or controversies this week
- Community debates, viral blog posts, surging GitHub repositories
- Research papers or findings that sparked notable discussion

**Search strategy**: Run multiple web_search calls — try queries like "trending AI tools this week", "new AI model release ${sinceDate}", "AI benchmark controversy", "AI tool hacker news", "LLM breakthrough week".

**Precise naming**: Use exact product/model names.

**Anti-hallucination**: Only include items you found real web sources for. Prefer 4 well-evidenced items over 8 vague ones.

Return ONLY valid JSON (no markdown fences):
{
  "items": [
    {
      "name": "<exact tool/model name>",
      "category": "<e.g. Model, Coding Agent, Image Generation, Reasoning Model, etc.>",
      "type": "<New launch | Existing tool surging | New benchmark/discovery>",
      "why_trending_on_web": "<specific reason with concrete evidence>",
      "evidence": [
        { "text": "<quote or observation>", "source": "<publication or site name>", "url": "<real URL or null>" }
      ],
      "links": ["<real URLs>"]
    }
  ]
}`;
}

function buildSynthesizerPrompt(grokRaw: string | null, claudeRaw: string | null): string {
  return `You are an expert AI analyst synthesizing trending AI topics from two independent sources.

**Source 1 — X (Twitter) signals** (Grok, native X search):
${grokRaw ?? "No data available from this source."}

**Source 2 — Web signals** (Claude web search — HN, blogs, GitHub, publications):
${claudeRaw ?? "No data available from this source."}

Your task:
1. **Merge and deduplicate**: If the same tool/model appears in both sources, merge into one item. Cross-source agreement is a strong quality signal — boost its ranking.
2. **Rank by quality**: Prioritize items with concrete evidence, real engagement numbers, and credible sources.
3. **Write clean output**: For each item, write a concise description and a short why_trending. Include the best evidence from whichever source had it.
4. **Target 6-10 high-quality items.** Drop anything generic or lacking real evidence.
5. **Write a trends_summary** (max 40 words) highlighting the dominant theme this week.

**Tone and language rules (critical):**
- Write for a smart non-specialist. Assume they use AI tools daily but don't read ML papers.
- Never use stock ticker symbols (e.g. $NVDA, $MSFT). Always write the full company name.
- Translate jargon into plain impact: instead of "achieves 88.7% on SWE-bench" say "handles nearly 9 out of 10 real coding tasks correctly in independent tests"; instead of "beats inference latency targets" say "responds faster than previous versions"; instead of "outperforms on GSM8K" say "noticeably better at maths and logic problems"; instead of "4B active parameters" say "a model small enough to run on a laptop".
- Keep benchmark numbers only if they're intuitive without context (e.g. "2x faster", "half the cost"). Drop opaque leaderboard scores unless you can explain them in one short plain-English clause.
- description: max 2 sentences. What it is and what's new — nothing more.
- why_trending: max 1 sentence. One clear reason: a viral post, a notable person, a surprising result.

For evidence: preserve tweet URLs from Source 1 and article URLs from Source 2 as-is.
For @handles in why_trending: always use the @handle format so they can be hyperlinked.

Return ONLY valid JSON matching this exact schema (no markdown fences):
{
  "items": [
    {
      "name": "<exact tool/model name>",
      "category": "<Coding Agent | Image/Video Generation | World Models | Model | Reasoning Model | Multimodal | Design Tools | Voice & Audio | Search & Research | Data & Analytics | Agents & Automation | Developer Tools | Enterprise Platform | Consumer App>",
      "type": "<New launch | Existing tool surging | New benchmark/discovery>",
      "description": "<max 2 sentences: what it is and what's new>",
      "why_trending": "<max 1 sentence: the single clearest reason it's trending. Use @handles for X users.>",
      "evidence": [
        { "text": "<quote or concrete observation>", "author": "<@handle or publication name>", "url": "<URL or null>" }
      ],
      "links": ["<real URLs>"]
    }
  ],
  "trends_summary": "<max 40 words>"
}`;
}

// --- Helpers ---

function extractGrokText(output: unknown[]): string | null {
  const message = output?.find(
    (item): item is { type: string; content: { type: string; text: string }[] } =>
      typeof item === "object" && item !== null && (item as { type: string }).type === "message"
  );
  return message?.content?.[0]?.text ?? null;
}

function extractJsonText(content: Anthropic.Messages.ContentBlock[]): string | null {
  for (let i = content.length - 1; i >= 0; i--) {
    const block = content[i];
    if (block.type === "text") {
      const text = block.text.trim();
      try {
        JSON.parse(text);
        return text;
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            JSON.parse(match[0]);
            return match[0];
          } catch {
            // try next block
          }
        }
      }
    }
  }
  return null;
}

// --- Sourcers ---

async function fetchGrokSignals(sinceDate: string): Promise<string | null> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROK_MODEL,
      instructions: "You are an AI analyst monitoring X (Twitter). Use x_search to find real posts. Return ONLY valid JSON, no markdown fences.",
      input: buildGrokPrompt(sinceDate),
      tools: [{ type: "x_search" }],
      temperature: 0.3,
      text: { format: { type: "json_object" } },
    }),
  });

  if (!res.ok) return null;
  const raw = await res.json();
  return extractGrokText(raw.output);
}

async function fetchClaudeWebSignals(sinceDate: string, anthropic: Anthropic): Promise<string | null> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 10000,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
    messages: [{ role: "user", content: buildClaudeWebPrompt(sinceDate) }],
  });

  return extractJsonText(response.content);
}

async function synthesize(
  grokRaw: string | null,
  claudeRaw: string | null,
  anthropic: Anthropic
): Promise<TrendingResponse> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 6000,
    messages: [{ role: "user", content: buildSynthesizerPrompt(grokRaw, claudeRaw) }],
  });

  const text = extractJsonText(response.content);
  if (!text) throw new Error("No JSON in synthesizer response");
  return JSON.parse(text) as TrendingResponse;
}

// --- Route ---

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[trending/refresh] CRON_SECRET not configured — refusing request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const sinceDate = getSinceDate();

  const [grokResult, claudeResult] = await Promise.allSettled([
    fetchGrokSignals(sinceDate),
    fetchClaudeWebSignals(sinceDate, anthropic),
  ]);

  const grokRaw = grokResult.status === "fulfilled" ? grokResult.value : null;
  const claudeRaw = claudeResult.status === "fulfilled" ? claudeResult.value : null;

  if (!grokRaw && !claudeRaw) {
    return NextResponse.json({ error: "Both sourcing models failed" }, { status: 500 });
  }

  let parsed: TrendingResponse;
  try {
    parsed = await synthesize(grokRaw, claudeRaw, anthropic);
  } catch (err) {
    console.error("[trending/refresh] synthesizer error:", err);
    return NextResponse.json({ error: "Synthesizer failed" }, { status: 500 });
  }

  const { error: dbError } = await supabase
    .from("trending_cache")
    .upsert({ id: 1, data: parsed, refreshed_at: new Date().toISOString() });

  if (dbError) {
    console.error("[trending/refresh] supabase write error:", dbError);
  }

  return NextResponse.json({ ok: true, itemCount: parsed.items.length });
}
