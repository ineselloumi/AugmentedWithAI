"use client";

import { useEffect, useState } from "react";
import type { EvidenceItem, TrendingItem, TrendingResponse } from "@/types";
import SubscribeForm from "./SubscribeForm";

function formatRefreshedAt(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  let hours = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return `${mm}/${dd} at ${hours}:${min}${ampm}`;
}

const LINK_CLASS = "text-neutral-300 hover:text-white underline underline-offset-2 decoration-neutral-600 hover:decoration-neutral-300 transition-colors";

function renderWithInlineLinks(text: string, evidence: EvidenceItem[], toolName: string): React.ReactNode {
  // Article sources: non-@ authors with a real URL
  const articleSources = evidence.filter(
    (e) => e.author && !e.author.startsWith("@") && e.url
  );

  // Split on @handles first
  const atParts = text.split(/(@\w+)/g);
  const nodes: React.ReactNode[] = [];

  atParts.forEach((part, i) => {
    if (part.startsWith("@")) {
      const ev = evidence.find((e) => e.author === part);
      const url = ev ? evidenceLink(ev, toolName) : `https://x.com/${part.slice(1)}`;
      nodes.push(
        <a key={`at-${i}`} href={url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          {part}
        </a>
      );
      return;
    }

    // Within plain text, find and link any article source names verbatim
    if (articleSources.length === 0) {
      nodes.push(part);
      return;
    }

    let remaining = part;
    let offset = 0;
    const segNodes: React.ReactNode[] = [];

    while (remaining.length > 0) {
      let earliest: { idx: number; src: typeof articleSources[0] } | null = null;
      for (const src of articleSources) {
        const idx = remaining.indexOf(src.author!);
        if (idx !== -1 && (earliest === null || idx < earliest.idx)) {
          earliest = { idx, src };
        }
      }
      if (!earliest) {
        segNodes.push(remaining);
        break;
      }
      if (earliest.idx > 0) segNodes.push(remaining.slice(0, earliest.idx));
      segNodes.push(
        <a key={`art-${i}-${offset}`} href={earliest.src.url!} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          {earliest.src.author}
        </a>
      );
      remaining = remaining.slice(earliest.idx + earliest.src.author!.length);
      offset++;
    }
    nodes.push(...segNodes);
  });

  return <>{nodes}</>;
}

export default function TrendingPanel({ hideHeader = false }: { hideHeader?: boolean }) {
  const [data, setData] = useState<TrendingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadTrending(attempt = 1) {
    try {
      const r = await fetch("/api/trending");
      if (!r.ok) throw new Error(`${r.status}`);
      const d: TrendingResponse = await r.json();
      setData(d);
      setError(false);
    } catch {
      if (attempt < 3) {
        setTimeout(() => loadTrending(attempt + 1), attempt * 2000);
      } else {
        setError(true);
      }
    } finally {
      if (attempt === 1) setLoading(false);
    }
  }

  useEffect(() => { loadTrending(); }, []);

  return (
    <aside className="w-full">
      {!hideHeader && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">𝕏</span>
            <h2 className="text-sm font-semibold text-white">Trending on X.com</h2>
            {data?.refreshed_at && (
              <span className="text-xs text-neutral-400 ml-auto">
                Last updated {formatRefreshedAt(data.refreshed_at)}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mb-4">This report is AI generated and may contain inaccuracies.</p>
        </>
      )}

      {loading && <SkeletonList />}

      {error && (
        <div className="text-xs text-neutral-400">
          <p>Could not load trending data.</p>
          <button
            onClick={() => { setError(false); setLoading(true); loadTrending(); }}
            className="mt-1 underline hover:text-white transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-3">
          {data.trends_summary && (
            <div className="mb-1">
              <p className="text-xs font-semibold text-neutral-300 mb-1">This week in AI</p>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {data.trends_summary.split(/\s+/).slice(0, 40).join(" ")}
              </p>
            </div>
          )}
          {data.items.map((item, i) => (
            <TrendingCard key={item.name} rank={i + 1} item={item} />
          ))}
        </div>
      )}

      {/* Waitlist — shown after content has loaded */}
      {!loading && (
        <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-4">
          <SubscribeForm />
        </div>
      )}
    </aside>
  );
}

// Real tweet IDs are 10+ digit numbers — anything shorter is likely fabricated.
// Also verify the username in the URL matches the evidence author to catch hallucinated URLs.
function isValidTweetUrl(url: string | null, author?: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!["x.com", "twitter.com"].includes(u.hostname)) return false;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 3 || parts[1] !== "status") return false;
    if (!/^\d{10,}$/.test(parts[2])) return false;
    if (author) {
      const handle = author.startsWith("@") ? author.slice(1) : author;
      if (parts[0].toLowerCase() !== handle.toLowerCase()) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function evidenceLink(ev: EvidenceItem, toolName: string): string {
  if (isValidTweetUrl(ev.url, ev.author ?? undefined)) return ev.url!;
  const q = ev.author ? `${ev.author} ${toolName}` : toolName;
  return `https://x.com/search?q=${encodeURIComponent(q)}&src=typed_query&f=top`;
}

function TrendingCard({ item }: { rank: number; item: TrendingItem }) {
  const xSearchUrl = `https://x.com/search?q=${encodeURIComponent(`"${item.name}"`)}&src=typed_query&f=top`;
  const evidence = Array.isArray(item.evidence) ? item.evidence : [];

  return (
    <div className="rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="shrink-0 mt-0.5 text-green-500" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 1L1.5 7h4L3.5 11.5 10.5 5H6.5L7 1z"/>
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <a
              href={xSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-white hover:text-green-400 transition-colors truncate"
            >
              {item.name}
            </a>
            <span className="text-xs text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded-full shrink-0">
              {item.category}
            </span>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            {renderWithInlineLinks(item.description, evidence, item.name)}
          </p>

          {item.why_trending && (
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              {renderWithInlineLinks(item.why_trending, evidence, item.name)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2.5 animate-pulse">
          <div className="flex gap-2">
            <div className="w-4 h-3 bg-neutral-800 rounded" />
            <div className="flex-1">
              <div className="h-3 bg-neutral-700 rounded w-2/3 mb-1.5" />
              <div className="h-2.5 bg-neutral-800 rounded w-full mb-1" />
              <div className="h-2.5 bg-neutral-800 rounded w-4/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
