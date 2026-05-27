import type { RoleAnalysisResponse, ToolsResponse } from "@/types";

export type ModelTier = "sonnet" | "haiku";

export interface LLMProvider {
  analyzeRole(role: string, tier?: ModelTier): Promise<RoleAnalysisResponse>;
  getToolsForTask(role: string, taskTitle: string, taskDescription: string): Promise<ToolsResponse>;
}

export type { RoleAnalysisResponse, ToolsResponse };
