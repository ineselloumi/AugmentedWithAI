import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { serverError } from "@/lib/errors";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LIMITS = {
  role: 100,
  taskTitle: 200,
  taskDescription: 1000,
  toolName: 100,
};

function validString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0 || t.length > max) return null;
  return t;
}

export async function POST(req: Request) {
  const rl = rateLimit(req, { key: "generate-prompt", limit: 10, windowSec: 60 });
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = validString(body.role, LIMITS.role);
  const taskTitle = validString(body.taskTitle, LIMITS.taskTitle);
  const taskDescription = validString(body.taskDescription, LIMITS.taskDescription);
  const toolName = validString(body.toolName, LIMITS.toolName);

  if (!role || !taskTitle || !taskDescription || !toolName) {
    return NextResponse.json(
      { error: "Missing or invalid fields (role ≤100, taskTitle ≤200, taskDescription ≤1000, toolName ≤100)" },
      { status: 400 },
    );
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Write a detailed, ready-to-use prompt that a ${role} can paste directly into ${toolName} to accomplish the following task: "${taskTitle}" — ${taskDescription}

The prompt should:
- Open by setting the AI's persona and expertise level (e.g. "You are a senior ${role} with deep expertise in...")
- Clearly state the objective and what needs to be produced
- Specify the output format (e.g. bullet points, sections with headers, a table, etc.)
- Include any important constraints, quality standards, or best practices to follow
- Be specific enough to produce an excellent result on the first try — no follow-up clarification needed

Length: 5-8 sentences. Return only the prompt text — no introduction, no explanation, no quotes around it.`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
    }

    return NextResponse.json({ prompt: text.text });
  } catch (err) {
    return serverError("generate-prompt", err);
  }
}
