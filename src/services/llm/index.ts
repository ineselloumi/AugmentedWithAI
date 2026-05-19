import type { LLMProvider } from "./types";
import { AnthropicProvider } from "./anthropic";

export function getProvider(): LLMProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new AnthropicProvider(apiKey);
}
