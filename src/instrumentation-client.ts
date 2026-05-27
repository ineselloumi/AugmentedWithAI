import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

if (key) {
  posthog.init(key, {
    api_host: host,
    // We track pageviews manually (initial load + onRouterTransitionStart)
    // to avoid duplicates with Next.js App Router client-side navigation.
    capture_pageview: false,
    capture_pageleave: true,
    // Only send events in production
    loaded: (ph) => {
      if (process.env.NODE_ENV !== "production") {
        ph.opt_out_capturing();
      } else {
        // Capture the initial page load
        ph.capture("$pageview", { $current_url: window.location.href });
      }
    },
  });
}

/**
 * Called by Next.js before every client-side navigation.
 * Fires a $pageview so PostHog sees each route as a distinct page.
 */
export function onRouterTransitionStart(url: string) {
  if (key && process.env.NODE_ENV === "production") {
    posthog.capture("$pageview", { $current_url: url });
  }
}
