"use client";

import { useRef } from "react";
import TrendingPanel from "./TrendingPanel";

export type DrawerState = "closed" | "partial" | "open";

const HANDLE_PX = 56; // h-14 in px

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function ChevronUp({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function getTranslate(state: DrawerState): string {
  if (state === "open")    return "translateY(0)";
  if (state === "partial") return "translateY(calc(100% - 20vh))";
  return `translateY(calc(100% - ${HANDLE_PX}px))`;
}

interface TrendingDrawerProps {
  drawerState: DrawerState;
  setDrawerState: (s: DrawerState) => void;
}

export default function TrendingDrawer({ drawerState, setDrawerState }: TrendingDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const startVisible = useRef(0);

  // --- Drag handlers (touch) ---
  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
    if (drawerRef.current) {
      const rect = drawerRef.current.getBoundingClientRect();
      startVisible.current = window.innerHeight - rect.top;
      drawerRef.current.style.transition = "none";
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!drawerRef.current) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    const newVisible = startVisible.current - delta;
    const clamped = Math.max(HANDLE_PX, Math.min(window.innerHeight * 0.85, newVisible));
    drawerRef.current.style.transform = `translateY(calc(100% - ${clamped}px))`;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!drawerRef.current) return;
    // Re-enable CSS transition before snapping
    drawerRef.current.style.transition = "";
    drawerRef.current.style.transform = "";

    const delta = e.changedTouches[0].clientY - dragStartY.current;
    const THRESHOLD = 60;

    if (delta < -THRESHOLD) {
      setDrawerState(drawerState === "closed" ? "partial" : "open");
    } else if (delta > THRESHOLD) {
      setDrawerState(drawerState === "open" ? "partial" : "closed");
    }
    // Small drag → snap back to current state (transition handles it)
  }

  function toggleHandle() {
    setDrawerState(drawerState === "open" ? "partial" : "open");
  }

  return (
    <>
      {/* Backdrop — only active when fully open */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          drawerState === "open"
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerState("partial")}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out"
        style={{ transform: getTranslate(drawerState) }}
      >
        {/* Drag handle bar */}
        <div
          onClick={toggleHandle}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="relative bg-neutral-900 border-t border-neutral-800 rounded-t-2xl px-4 h-14 flex items-center gap-2 cursor-pointer select-none touch-none"
        >
          {/* Drag pill indicator */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-neutral-700 rounded-full" />
          <XLogo className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-sm font-semibold text-white">Trending on X.com</span>
          <span className="ml-auto text-neutral-400">
            {drawerState === "open" ? <ChevronDown /> : <ChevronUp />}
          </span>
        </div>

        {/* Scrollable content */}
        <div className="bg-neutral-900 overflow-y-auto h-[75vh] px-4 pb-8 pt-2">
          <p className="text-xs text-neutral-500 mb-4">
            This report is AI generated and may contain inaccuracies.
          </p>
          <TrendingPanel hideHeader />
        </div>
      </div>
    </>
  );
}
