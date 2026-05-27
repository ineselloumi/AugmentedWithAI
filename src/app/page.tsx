"use client";

import { useState } from "react";
import type { Task, TaskTool } from "@/types";
import SearchBar from "@/components/SearchBar";
import ResultsSection from "@/components/ResultsSection";
import TrendingPanel from "@/components/TrendingPanel";
import TrendingDrawer, { type DrawerState } from "@/components/TrendingDrawer";

const QUICK_ROLES = ["Product Manager", "Software Engineer", "Data Analyst", "Marketing Manager"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [submittedRole, setSubmittedRole] = useState("");
  const [displayRole, setDisplayRole] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [toolsMap, setToolsMap] = useState<Record<string, TaskTool[] | null>>({});
  const [loadingTools, setLoadingTools] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [freeOnly, setFreeOnly] = useState(false);
  const [drawerState, setDrawerState] = useState<DrawerState>("partial");

  async function fetchToolsForTask(role: string, task: Task) {
    setLoadingTools((prev) => ({ ...prev, [task.id]: true }));
    try {
      const res = await fetch("/api/role-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          taskTitle: task.title,
          taskDescription: task.description,
          taskId: task.id,
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
    setDisplayRole(searchRole);
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
      resolvedTasks.forEach((task) => fetchToolsForTask(resolvedRole, task));
    } catch {
      setError("Failed to reach the server. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <>
    {/* Mobile drawer — outside flex container so it doesn't affect layout */}
    <div className="lg:hidden">
      <TrendingDrawer drawerState={drawerState} setDrawerState={setDrawerState} />
    </div>
    <main className="min-h-screen bg-[#0a0a0a] flex flex-row gap-10 items-start px-4 pt-14 pb-20">
      <div className="flex-1 flex justify-center w-full">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-neutral-400 text-sm font-semibold">AUGMENTED WITH AI</p>
          <button
            onClick={() => setDrawerState("open")}
            className="lg:hidden flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1.5 text-xs text-white"
          >
            <span className="font-medium">Trending on</span>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
        <h1 className="text-4xl font-bold text-white leading-tight mb-3">
          <span className="underline decoration-white underline-offset-4">Multiply your impact</span> at work
        </h1>
        <p className="text-neutral-300 text-sm leading-relaxed mb-7">
          Type in your job title to see a detailed report on responsibilities and the best tools to optimize them. These tools have the potential to accomplish the work faster, increase its quality, or both.
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

        {error && (
          <p className="mt-6 text-sm text-red-400 bg-red-950 border border-red-900 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {!isLoading && tasks.length === 0 && !error && <HowItWorks />}

        {(isLoading || tasks.length > 0) && (
          <ResultsSection
            role={submittedRole}
            displayRole={displayRole}
            tasks={tasks}
            toolsMap={toolsMap}
            loadingTools={loadingTools}
            isLoading={isLoading}
            freeOnly={freeOnly}
          />
        )}
      </div>
      </div>
      {/* Desktop sidebar — only rendered on large screens */}
      <div className="hidden lg:block w-[480px] shrink-0 sticky top-8 pr-2">
        <TrendingPanel />
      </div>
    </main>
    </>
  );
}

const STEPS = [
  {
    title: "Map out your role",
    description: "We identify the core responsibilities that make up your job title.",
  },
  {
    title: "Rank by time and AI impact",
    description: "Each task is scored by how much time it takes and how much AI can realistically help.",
  },
  {
    title: "Surface the best tools",
    description: "We find the most effective AI tools available today for each specific task.",
  },
];

function HowItWorks() {
  return (
    <section className="mt-10">
      <p className="text-xs font-semibold text-white uppercase tracking-widest mb-4 text-center">
        How it works
      </p>
      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-neutral-400">{i + 1}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-0.5">{step.title}</p>
              <p className="text-sm text-neutral-400 leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
