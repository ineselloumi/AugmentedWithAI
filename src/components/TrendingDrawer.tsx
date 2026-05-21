"use client";

import { useState } from "react";
import TrendingPanel from "./TrendingPanel";

export default function TrendingDrawer() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Top-right trigger pill */}
      <button
        onClick={() => setExpanded(true)}
        className="fixed top-4 right-4 z-40 flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1.5 text-xs text-white shadow-lg"
        aria-label="Open trending panel"
      >
        <span className="text-base leading-none">𝕏</span>
        <span className="font-medium">Trending</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          expanded ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setExpanded(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
          expanded ? "translate-y-0" : "translate-y-[calc(100%-56px)]"
        }`}
      >
        {/* Peek handle bar */}
        <div
          onClick={() => setExpanded(!expanded)}
          className="relative bg-neutral-900 border-t border-neutral-800 rounded-t-2xl px-4 h-14 flex items-center gap-2 cursor-pointer select-none"
        >
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-neutral-700 rounded-full" />
          <span className="text-base mt-0.5">𝕏</span>
          <span className="text-sm font-semibold text-white">Trending on X.com</span>
          <span className="ml-auto text-neutral-400">
            {expanded ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            )}
          </span>
        </div>

        {/* Scrollable content */}
        <div className="bg-neutral-900 overflow-y-auto h-[75vh] px-4 pb-8 pt-2">
          <p className="text-xs text-neutral-500 mb-4">This report is AI generated and may contain inaccuracies.</p>
          <TrendingPanel hideHeader />
        </div>
      </div>
    </>
  );
}
