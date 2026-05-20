export interface TaskTool {
  name: string;
  description: string;
  free_tier: "free_trial" | "free_plan" | null;
  url: string | null;
  is_chatbot: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  time_pct: number;
  automation_potential: "Low" | "Medium" | "High" | "Very High";
}

export interface RoleAnalysisResponse {
  role: string;
  tasks: Task[];
}

export interface ToolsResponse {
  tools: TaskTool[];
}

export interface EvidenceItem {
  text: string;
  author: string;
  url: string | null;
}

export interface TrendingItem {
  name: string;
  category: string;
  type: string;
  description: string;
  why_trending: string;
  evidence: EvidenceItem[];
  links: string[];
}

export interface TrendingResponse {
  items: TrendingItem[];
  trends_summary: string;
}
