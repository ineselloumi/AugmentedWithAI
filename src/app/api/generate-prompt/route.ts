import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  let body: { role?: string; taskTitle?: string; taskDescription?: string; toolName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { role, taskTitle, taskDescription, toolName } = body;
  if (!role || !taskTitle || !taskDescription || !toolName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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
}
