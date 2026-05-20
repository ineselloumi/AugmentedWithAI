"use client";

import { useState } from "react";
import type { Task, TaskTool } from "@/types";
import SearchBar from "@/components/SearchBar";
import SearchFilters from "@/components/SearchFilters";
import ResultsSection from "@/components/ResultsSection";
import TrendingPanel from "@/components/TrendingPanel";

const QUICK_ROLES = ["Product Manager", "Software Engineer", "Data Analyst", "Marketing Manager"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [submittedRole, setSubmittedRole] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [toolsMap, setToolsMap] = useState<Record<string, TaskTool[] | null>>({});
  const [loadingTools, setLoadingTools] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasChatGPT, setHasChatGPT] = useState(false);
  const [hasClaude, setHasClaude] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);

  function handleFilterChange(key: "hasChatGPT" | "hasClaude" | "freeOnly", value: boolean) {
    if (key === "hasChatGPT") setHasChatGPT(value);
    if (key === "hasClaude") setHasClaude(value);
    if (key === "freeOnly") setFreeOnly(value);
  }

  async function fetchToolsForTask(role: string, task: Task, chatGPT: boolean, claude: boolean) {
    setLoadingTools((prev) => ({ ...prev, [task.id]: true }));
    try {
      const res = await fetch("/api/role-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          taskTitle: task.title,
          taskDescription: task.description,
          hasChatGPT: chatGPT,
          hasClaude: claude,
        }),
      });
      const data = await res.json();
      setToolsMap((prev) => ({
        ...prev,
        [task.id]: res.ok ? data.tools : null,
      }));
    } catch {
      setToolsMap((prev) => ({ ...prev, [task.id]: null }));
    } finally {
      setLoadingTools((prev) => ({ ...prev, [task.id]: false }));
    }
  }

  async function handleSearch(role?: string) {
    const searchRole = (role ?? query).trim();
    if (!searchRole) return;

    if (role) setQuery(role);
    setIsLoading(true);
    setError(null);
    setTasks([]);
    setToolsMap({});
    setLoadingTools({});

    try {
      // Phase 1 — fast, no web search
      const res = await fetch("/api/analyze-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: searchRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      const resolvedRole: string = data.role;
      const resolvedTasks: Task[] = data.tasks;

      setSubmittedRole(resolvedRole);
      setTasks(resolvedTasks);
      setIsLoading(false);

      // Phase 2 — parallel tool fetches, one per task
      // Snapshot filter state at search time so all tasks use the same flags
      resolvedTasks.forEach((task) => fetchToolsForTask(resolvedRole, task, hasChatGPT, hasClaude));
    } catch {
      setError("Failed to reach the server. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex gap-10 items-start px-4 pt-14 pb-20">
      <div className="flex-1 flex justify-center">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <p className="text-green-400 text-sm font-semibold mb-3">AI Discovery</p>
        <h1 className="text-4xl font-bold text-white leading-tight mb-3">
          <span className="underline decoration-white underline-offset-4">Multiply your impact</span> at work
        </h1>
        <p className="text-neutral-300 text-sm leading-relaxed mb-7">
          Search your job title to discover high-leverage automations
        </p>

        {/* Search */}
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={() => handleSearch()}
          onSelectRole={(role) => handleSearch(role)}
          quickRoles={QUICK_ROLES}
          isLoading={isLoading}
        />

        <SearchFilters
          hasChatGPT={hasChatGPT}
          hasClaude={hasClaude}
          freeOnly={freeOnly}
          onChange={handleFilterChange}
          disabled={isLoading}
        />

        {error && (
          <p className="mt-6 text-sm text-red-400 bg-red-950 border border-red-900 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {(isLoading || tasks.length > 0) && (
          <ResultsSection
            role={submittedRole}
            tasks={tasks}
            toolsMap={toolsMap}
            loadingTools={loadingTools}
            isLoading={isLoading}
            freeOnly={freeOnly}
          />
        )}
      </div>
      </div>
      <div className="w-[480px] shrink-0 sticky top-8 hidden lg:block pr-2">
        <TrendingPanel />
      </div>
    </main>
  );
}
