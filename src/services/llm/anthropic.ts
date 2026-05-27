import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ModelTier, RoleAnalysisResponse, ToolsResponse } from "./types";
import {
  ANALYZE_ROLE_SYSTEM,
  analyzeRoleUserPrompt,
  TOOLS_SYSTEM,
  toolsUserPrompt,
} from "@/lib/prompts";

const MODELS: Record<ModelTier, string> = {
  sonnet: "claude-sonnet-4-6",
  haiku:  "claude-haiku-4-5-20251001",
};

function extractJson(text: string): string {
  let raw = text.trim();
  // Strip markdown code fences
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // If there's still surrounding prose, extract the first {...} block
  if (!raw.startsWith("{")) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) raw = match[0];
  }
  return raw;
}

function lastTextBlock(content: Anthropic.ContentBlock[]): string {
  const textBlocks = content.filter((b) => b.type === "text");
  const block = textBlocks[textBlocks.length - 1];
  if (!block || block.type !== "text") throw new Error("No text block in LLM response");
  return block.text;
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  // Phase 1 — fast, no web search
  async analyzeRole(role: string, tier: ModelTier = "sonnet"): Promise<RoleAnalysisResponse> {
    const response = await this.client.messages.create({
      model: MODELS[tier],
      max_tokens: 1000,
      system: [{ type: "text", text: ANALYZE_ROLE_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: analyzeRoleUserPrompt(role) }],
    });

    const rawText = extractJson(lastTextBlock(response.content));

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error("LLM returned invalid JSON");
    }

    const data = parsed as Record<string, unknown>;
    if (data.error) throw new Error(`LLM error: ${data.error}`);
    if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
      throw new Error("Invalid tasks in LLM response");
    }

    return data as unknown as RoleAnalysisResponse;
  }

  // Phase 2 — with web search, called in parallel per task
  async getToolsForTask(
    role: string,
    taskTitle: string,
    taskDescription: string,
  ): Promise<ToolsResponse> {
    const response = await this.client.messages.create({
      model: MODELS.sonnet,
      max_tokens: 2048,
      system: [{ type: "text", text: TOOLS_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: toolsUserPrompt(role, taskTitle, taskDescription) }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
    });

    const rawText = extractJson(lastTextBlock(response.content));

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("[getToolsForTask] Failed to parse JSON:", rawText.slice(0, 300));
      throw new Error("LLM returned invalid JSON for tools");
    }

    const data = parsed as Record<string, unknown>;
    if (!Array.isArray(data.tools)) throw new Error("No tools in LLM response");

    return data as unknown as ToolsResponse;
  }
}
