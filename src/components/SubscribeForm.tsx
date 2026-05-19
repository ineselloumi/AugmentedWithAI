"use client";

import { useState } from "react";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
      } else if (data.alreadySubscribed) {
        setState("duplicate");
      } else {
        setState("success");
        setEmail("");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <p className="text-xs text-green-400 text-center py-1">
        ✓ You&apos;re on the list! We&apos;ll send the weekly AI report to your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setState("idle"); }}
        placeholder="your@email.com"
        required
        className="flex-1 min-w-0 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
      >
        {state === "loading" ? "…" : "Subscribe"}
      </button>

      {state === "duplicate" && (
        <span className="absolute text-xs text-amber-400 mt-8">Already subscribed.</span>
      )}
      {state === "error" && (
        <span className="absolute text-xs text-red-400 mt-8">Something went wrong.</span>
      )}
    </form>
  );
}
