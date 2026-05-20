"use client";

import { useState, useEffect } from "react";
import type { Task, TaskTool } from "@/types";

interface TaskCardProps {
  rank: number;
  role: string;
  task: Task;
  tools: TaskTool[] | null | undefined;
  isLoadingTools: boolean;
  freeOnly: boolean;
}

const RANK_BADGE: Record<number, string> = {
  1: "bg-gradient-to-br from-green-500 to-green-700",
  2: "bg-gradient-to-br from-purple-500 to-purple-800",
  3: "bg-gradient-to-br from-blue-500 to-blue-800",
  4: "bg-gradient-to-br from-orange-500 to-orange-800",
  5: "bg-gradient-to-br from-pink-500 to-pink-800",
};

const AUTOMATION_BADGE: Record<string, string> = {
  "Very High": "text-green-400 bg-green-950 border-green-900",
  High: "text-blue-400 bg-blue-950 border-blue-900",
  Medium: "text-yellow-400 bg-yellow-950 border-yellow-900",
  Low: "text-neutral-400 bg-neutral-800 border-neutral-700",
};

const FREE_TIER_LABEL: Record<string, string> = {
  free_plan: "Free plan",
  free_trial: "Free trial",
};

function ToolCard({
  tool,
  role,
  task,
  preloadedPrompt,
}: {
  tool: TaskTool;
  role: string;
  task: Task;
  preloadedPrompt: string | null;
}) {
  const [promptState, setPromptState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generatePrompt() {
    if (preloadedPrompt) {
      setPrompt(preloadedPrompt);
      setPromptState("done");
      return;
    }
    setPromptState("loading");
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          taskTitle: task.title,
          taskDescription: task.description,
          toolName: tool.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrompt(data.prompt);
      setPromptState("done");
    } catch {
      setPromptState("error");
    }
  }

  async function copyPrompt() {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-neutral-800/60 px-3 py-2">
      <div className="flex items-start gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400 shrink-0 mt-0.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {tool.url ? (
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white text-xs font-bold underline underline-offset-2 decoration-neutral-500 hover:decoration-white transition-colors"
              >
                {tool.name}
              </a>
            ) : (
              <span className="text-white text-xs font-bold">{tool.name}</span>
            )}
            {tool.free_tier && (
              <span className="text-emerald-400 text-xs bg-emerald-950/60 border border-emerald-900 px-1.5 py-0.5 rounded-full">
                {FREE_TIER_LABEL[tool.free_tier]}
              </span>
            )}
          </div>
          <p className="text-neutral-300 text-xs mt-0.5 leading-relaxed">{tool.description}</p>
        </div>
      </div>

      {tool.is_chatbot && (
        <div className="pl-4 flex justify-end">
          {promptState === "idle" && (
            <button
              onClick={generatePrompt}
              className="text-xs text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-500 rounded-lg px-3 py-1.5 transition-colors"
            >
              ✦ Generate example prompt
            </button>
          )}
          {promptState === "loading" && (
            <p className="text-xs text-neutral-500 animate-pulse">Generating prompt…</p>
          )}
          {promptState === "error" && (
            <p className="text-xs text-red-400">Failed to generate. <button onClick={generatePrompt} className="underline">Try again</button></p>
          )}
          {promptState === "done" && prompt && (
            <div className="mt-1 rounded-lg border border-neutral-700 bg-neutral-900 p-3 w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-400">Example prompt</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={copyPrompt}
                    className="text-xs text-neutral-500 hover:text-white transition-colors"
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => setPromptState("idle")}
                    className="text-neutral-500 hover:text-white transition-colors"
                    title="Collapse"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 14 10 14 10 20" />
                      <polyline points="20 10 14 10 14 4" />
                      <line x1="10" y1="14" x2="3" y2="21" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">{prompt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TaskCard({ rank, role, task, tools, isLoadingTools, freeOnly }: TaskCardProps) {
  const [preloadedPrompts, setPreloadedPrompts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isLoadingTools || !tools) return;
    const chatbotTools = tools.filter((t) => t.is_chatbot);
    if (chatbotTools.length === 0) return;

    let cancelled = false;

    async function preloadAll() {
      for (const tool of chatbotTools) {
        if (cancelled) break;
        try {
          const res = await fetch("/api/generate-prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role,
              taskTitle: task.title,
              taskDescription: task.description,
              toolName: tool.name,
            }),
          });
          const data = await res.json();
          if (!cancelled && res.ok) {
            setPreloadedPrompts((prev) => ({ ...prev, [tool.name]: data.prompt }));
          }
        } catch {
          // silently skip — user can still generate on demand
        }
      }
    }

    preloadAll();
    return () => { cancelled = true; };
  }, [isLoadingTools, tools, role, task.title, task.description]);

  const visibleTools = tools && freeOnly ? tools.filter((t) => t.free_tier !== null) : tools;
  const badgeGradient = RANK_BADGE[rank] ?? "bg-neutral-700";
  const automationStyle = AUTOMATION_BADGE[task.automation_potential] ?? AUTOMATION_BADGE["Low"];

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-sm ${badgeGradient}`}>
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{task.title}</p>
            <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${automationStyle}`}>
              ↑ {task.automation_potential}
            </span>
            <span className="text-neutral-400 text-xs">{task.time_pct}% of time</span>
          </div>
          <p className="text-neutral-400 text-xs mt-0.5 leading-relaxed">{task.description}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {isLoadingTools ? (
          <>
            <div className="h-12 bg-neutral-800 rounded-xl animate-pulse" />
            <div className="h-12 bg-neutral-800 rounded-xl animate-pulse" />
          </>
        ) : visibleTools && visibleTools.length > 0 ? (
          visibleTools.map((tool) => (
            <ToolCard
              key={tool.name}
              tool={tool}
              role={role}
              task={task}
              preloadedPrompt={preloadedPrompts[tool.name] ?? null}
            />
          ))
        ) : visibleTools != null && visibleTools.length === 0 && tools && tools.length > 0 ? (
          <p className="text-xs text-neutral-400">No tools with a free tier found for this task.</p>
        ) : tools === null ? (
          <p className="text-xs text-neutral-400">Could not load tools. Try again.</p>
        ) : null}
      </div>
    </div>
  );
}
