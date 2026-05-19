import fs from "fs";
import path from "path";
import type { RoleAnalysisResponse } from "@/types";

const CACHE_FILE = path.join(process.cwd(), ".role-cache.json");
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEntry {
  data: RoleAnalysisResponse;
  cachedAt: number;
}

type CacheStore = Record<string, CacheEntry>;

function normalizeKey(role: string): string {
  return role.toLowerCase().trim();
}

function readStore(): CacheStore {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw) as CacheStore;
  } catch {
    return {};
  }
}

function writeStore(store: CacheStore): void {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function getCached(role: string): RoleAnalysisResponse | null {
  const store = readStore();
  const entry = store[normalizeKey(role)];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) return null;
  return entry.data;
}

export function setCached(role: string, data: RoleAnalysisResponse): void {
  const store = readStore();
  store[normalizeKey(role)] = { data, cachedAt: Date.now() };
  writeStore(store);
}
