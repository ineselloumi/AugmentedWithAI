import type { Task, TaskTool } from "@/types";

interface TaskCardProps {
  rank: number;
  task: Task;
  tools: TaskTool[] | undefined;
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

export default function TaskCard({ rank, task, tools, isLoadingTools, freeOnly }: TaskCardProps) {
  const visibleTools = tools && freeOnly ? tools.filter((t) => t.free_tier !== null) : tools;
  const badgeGradient = RANK_BADGE[rank] ?? "bg-neutral-700";
  const automationStyle = AUTOMATION_BADGE[task.automation_potential] ?? AUTOMATION_BADGE["Low"];

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-sm ${badgeGradient}`}
        >
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{task.title}</p>
            <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${automationStyle}`}>
              ↑ {task.automation_potential}
            </span>
            <span className="text-neutral-500 text-xs">{task.time_pct}% of time</span>
          </div>
          <p className="text-neutral-500 text-xs mt-0.5 leading-relaxed">{task.description}</p>
        </div>
      </div>

      {/* Tools */}
      <div className="mt-4 flex flex-col gap-2">
        {isLoadingTools ? (
          <>
            <div className="h-12 bg-neutral-800 rounded-xl animate-pulse" />
            <div className="h-12 bg-neutral-800 rounded-xl animate-pulse" />
          </>
        ) : visibleTools && visibleTools.length > 0 ? (
          visibleTools.map((tool) => (
            <div
              key={tool.name}
              className="flex items-start gap-2 rounded-xl bg-neutral-800/60 border border-neutral-700/50 px-3 py-2"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-yellow-400 shrink-0 mt-0.5"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-xs font-medium">{tool.name}</span>
                  {tool.free_tier && (
                    <span className="text-emerald-400 text-xs bg-emerald-950/60 border border-emerald-900 px-1.5 py-0.5 rounded-full">
                      {FREE_TIER_LABEL[tool.free_tier]}
                    </span>
                  )}
                </div>
                <p className="text-neutral-400 text-xs mt-0.5 leading-relaxed">{tool.description}</p>
              </div>
            </div>
          ))
        ) : visibleTools !== undefined && visibleTools.length === 0 && tools && tools.length > 0 ? (
          <p className="text-xs text-neutral-600">No tools with a free tier found for this task.</p>
        ) : tools === null ? (
          <p className="text-xs text-neutral-600">Could not load tools. Try again.</p>
        ) : null}
      </div>
    </div>
  );
}
