import type { RoleAnalysisResponse, ToolsResponse } from "@/types";

export interface LLMProvider {
  analyzeRole(role: string): Promise<RoleAnalysisResponse>;
  getToolsForTask(role: string, taskTitle: string, taskDescription: string): Promise<ToolsResponse>;
}

export type { RoleAnalysisResponse, ToolsResponse };
