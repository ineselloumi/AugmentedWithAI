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
      <p className="text-sm text-white py-1">
        ✓ You&apos;re on the list! You will be notified when we release the weekly digest.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-neutral-300 mb-3">
        Enjoyed reading this report? Join the waitlist for a weekly digest sent directly to your email:
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setState("idle"); }}
          placeholder="your@email.com"
          required
          className="flex-1 min-w-0 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shrink-0"
        >
          {state === "loading" ? "…" : "Join waitlist"}
        </button>
      </form>
      {state === "duplicate" && (
        <p className="text-xs text-amber-400 mt-2">You&apos;re already on the list.</p>
      )}
      {state === "error" && (
        <p className="text-xs text-red-400 mt-2">Something went wrong. Please try again.</p>
      )}
    </div>
  );
}
