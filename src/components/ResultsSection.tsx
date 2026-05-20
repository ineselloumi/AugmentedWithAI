import type { Task, TaskTool } from "@/types";
import TaskCard from "./TaskCard";

interface ResultsSectionProps {
  role: string;
  tasks: Task[];
  toolsMap: Record<string, TaskTool[] | null>;
  loadingTools: Record<string, boolean>;
  isLoading: boolean;
  freeOnly: boolean;
}

export default function ResultsSection({
  role,
  tasks,
  toolsMap,
  loadingTools,
  isLoading,
  freeOnly,
}: ResultsSectionProps) {
  return (
    <section className="w-full mt-10">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-white">
          Top automation opportunities
          {role && <span className="text-neutral-300"> for: "{role}"</span>}
        </h2>
      </div>
      <p className="text-xs text-neutral-400 mb-4">
        These estimations are based on general work data and may vary depending on your employer or
        work environment.
      </p>

      <div className="flex flex-col gap-3">
        {isLoading
          ? [1, 2, 3, 4, 5].map((rank) => <SkeletonCard key={rank} rank={rank} />)
          : tasks.map((task, idx) => (
              <TaskCard
                key={task.id}
                rank={idx + 1}
                role={role}
                task={task}
                tools={toolsMap[task.id]}
                isLoadingTools={loadingTools[task.id] ?? false}
                freeOnly={freeOnly}
              />
            ))}
      </div>
    </section>
  );
}

function SkeletonCard({ rank }: { rank: number }) {
  const colors = ["bg-green-800", "bg-purple-800", "bg-blue-800", "bg-orange-800", "bg-pink-800"];
  const badgeColor = colors[rank - 1] ?? "bg-neutral-700";
  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl shrink-0 ${badgeColor}`} />
        <div className="flex-1">
          <div className="h-4 bg-neutral-700 rounded w-2/3 mb-2" />
          <div className="h-3 bg-neutral-800 rounded w-full mb-1" />
          <div className="h-3 bg-neutral-800 rounded w-4/5" />
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-12 bg-neutral-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
