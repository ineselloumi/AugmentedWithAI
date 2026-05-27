import { supabase } from "@/lib/supabase";
import type { ToolsResponse } from "@/types";
import { normalizeRole } from "@/lib/roleAliases";

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — cron keeps it fresh weekly

export async function getToolsCached(
  role: string,
  taskId: string
): Promise<ToolsResponse | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tools_cache")
    .select("data, cached_at")
    .eq("role", normalizeRole(role))
    .eq("task_id", taskId)
    .single();

  if (error || !data) return null;

  const age = Date.now() - new Date(data.cached_at).getTime();
  if (age > TTL_MS) return null;

  return data.data as ToolsResponse;
}

export async function setToolsCached(
  role: string,
  taskId: string,
  result: ToolsResponse
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("tools_cache")
    .upsert({
      role: normalizeRole(role),
      task_id: taskId,
      data: result,
      cached_at: new Date().toISOString(),
    });

  if (error) {
    console.error("[toolsCache] supabase write error:", error);
  }
}
