import { supabase } from "@/lib/supabase";
import type { RoleAnalysisResponse } from "@/types";

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function normalizeKey(role: string): string {
  return role.toLowerCase().trim();
}

export async function getCached(role: string): Promise<RoleAnalysisResponse | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("role_cache")
    .select("data, cached_at")
    .eq("role", normalizeKey(role))
    .single();

  if (error || !data) return null;

  const age = Date.now() - new Date(data.cached_at).getTime();
  if (age > TTL_MS) return null;

  return data.data as RoleAnalysisResponse;
}

export async function setCached(role: string, result: RoleAnalysisResponse): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("role_cache")
    .upsert({ role: normalizeKey(role), data: result, cached_at: new Date().toISOString() });

  if (error) {
    console.error("[roleCache] supabase write error:", error);
  }
}
