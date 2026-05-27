import { notFound } from "next/navigation";
import { loadReport } from "@/services/pipeline/store";
import type { ReportItem } from "@/services/pipeline/types";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: "verified" | "partial" }) {
  return status === "verified" ? (
    <span className="text-xs text-green-400 font-medium">✓ verified</span>
  ) : (
    <span className="text-xs text-amber-400 font-medium">◑ partial</span>
  );
}

function ItemCard({ item, index }: { item: ReportItem; index: number }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-neutral-600 text-sm font-mono mt-0.5">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-white font-semibold text-sm">{item.name}</h3>
            <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">
              {item.category}
            </span>
            <span className="text-xs text-neutral-600">{item.type}</span>
            <StatusBadge status={item.verification_status} />
          </div>
          <p className="text-neutral-300 text-sm leading-relaxed mb-2">{item.description}</p>
          <p className="text-neutral-500 text-xs leading-relaxed mb-3">{item.why_trending}</p>

          {item.evidence.length > 0 && (
            <ul className="space-y-1.5 mb-3">
              {item.evidence.map((ev, i) => (
                <li key={i} className="text-xs text-neutral-400">
                  &ldquo;{ev.text}&rdquo;
                  {" — "}
                  {ev.url ? (
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {ev.author || "source"}
                    </a>
                  ) : (
                    <span className="text-neutral-600">{ev.author || "source"}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            {item.sources.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neutral-600 hover:text-neutral-400 underline truncate max-w-xs"
              >
                {url}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = loadReport(token);

  if (!report) notFound();

  const approveUrl = `/api/pipeline/approve/${token}`;
  const discardUrl = `/api/pipeline/discard/${token}`;

  const statusColor =
    report.status === "approved"
      ? "text-green-400"
      : report.status === "discarded"
      ? "text-red-400"
      : "text-amber-400";

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            AI Trends Report — {report.date}
          </h1>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <span className={statusColor}>
              {report.status === "pending" ? "⏳ Pending review" : report.status === "approved" ? "✓ Approved" : "✕ Discarded"}
            </span>
            <span>{report.stats.discovered} discovered</span>
            <span>{report.stats.verified} verified</span>
            <span>{report.stats.partial} partial</span>
            <span>{report.stats.dropped} dropped</span>
            <span className="text-white font-medium">{report.items.length} in report</span>
          </div>
        </div>

        {/* Action buttons — only shown when pending. Forms use POST so email
            link-previewers and antivirus scanners can't auto-trigger them. */}
        {report.status === "pending" && (
          <div className="flex gap-3 mb-8">
            <form action={approveUrl} method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                ✓ Approve &amp; Send to subscribers
              </button>
            </form>
            <form action={discardUrl} method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 bg-neutral-800 hover:bg-red-900 text-neutral-300 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                ✕ Discard
              </button>
            </form>
          </div>
        )}

        {/* Report items */}
        <div className="space-y-4 mb-8">
          {report.items.map((item, i) => (
            <ItemCard key={item.name} item={item} index={i} />
          ))}
        </div>

        {/* Dropped items */}
        {report.dropped.length > 0 && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <h2 className="text-sm font-semibold text-neutral-500 mb-3">
              Dropped ({report.dropped.length})
            </h2>
            <ul className="space-y-1">
              {report.dropped.map((d, i) => (
                <li key={i} className="text-xs text-neutral-600">
                  <span className="text-neutral-500">{d.name}</span> — {d.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-neutral-700 mt-6">
          Report ID: {report.id}
        </p>
      </div>
    </div>
  );
}
