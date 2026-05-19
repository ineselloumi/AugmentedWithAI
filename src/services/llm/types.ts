import type { RoleAnalysisResponse, ToolsResponse } from "@/types";

export interface SubscriptionContext {
  hasChatGPT: boolean;
  hasClaude: boolean;
}

export interface LLMProvider {
  analyzeRole(role: string): Promise<RoleAnalysisResponse>;
  getToolsForTask(role: string, taskTitle: string, taskDescription: string, subscriptions: SubscriptionContext): Promise<ToolsResponse>;
}

export type { RoleAnalysisResponse, ToolsResponse };
