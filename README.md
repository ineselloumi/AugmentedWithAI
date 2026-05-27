# MultiplyMe

**Discover the best AI tools for your job — fast.**

Type in any job title and MultiplyMe maps out the five tasks that take the most of your time, scores each one by how much AI can realistically help, and surfaces the most effective AI tools available today for every task.

Live at → **[augmentedwith.ai](https://augmentedwith.ai)**

---

## How it works

1. **Role analysis (Phase 1)** — Claude Haiku identifies the top 5 highest-impact tasks for the given role, weighted by time spent and AI automation potential. Results are cached in Supabase for 30 days, so repeat searches are instant.
2. **Tool discovery (Phase 2)** — Claude Sonnet runs a web-search-powered lookup for each task in parallel, finding AI-native tools with strong adoption and real automation depth. Results are also cached per role + task.
3. **Trending panel** — A sidebar (desktop) / bottom drawer (mobile) shows trending AI topics from X.com, refreshed daily via a Vercel cron job.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| LLM | Anthropic API (Claude Haiku + Sonnet) |
| Database / cache | Supabase (PostgreSQL) |
| Analytics | PostHog |
| Email | Resend |
| Deployment | Vercel |

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/your-username/multiplyme.git
cd multiplyme
npm install
```

### 2. Set environment variables

Copy the example below into a `.env.local` file at the root of the project.

```bash
# ── Required ──────────────────────────────────────────────────────────────────

# Anthropic — powers both the role analysis and the tool discovery steps.
# Get a key at https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# Supabase — used for caching role analyses and tool recommendations,
# storing the email waitlist, and persisting trending data.
# Find both values in your project's Settings → API page.
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ── Optional ──────────────────────────────────────────────────────────────────

# PostHog — product analytics (pageviews, search events).
# Only fires in production; automatically disabled in development.
# Get a key at https://posthog.com
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # default if omitted
```

> **Note:** The app runs without Supabase — caching is simply skipped and the waitlist falls back to a local file. The Anthropic key is always required.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scheduled jobs (Vercel crons)

Configured in [`vercel.json`](vercel.json), these run automatically on Vercel:

| Path | Schedule | What it does |
|---|---|---|
| `/api/trending/refresh` | Daily at 17:00 UTC | Refreshes the trending AI topics panel |
| `/api/cache/refresh` | Sundays at 03:00 UTC | Re-runs role analysis for all cached roles to keep results current |

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze-role/     # Phase 1: role → tasks
│   │   ├── role-tools/       # Phase 2: task → AI tools
│   │   ├── trending/         # Trending panel data + refresh cron
│   │   ├── cache/            # Weekly cache refresh cron
│   │   ├── subscribe/        # Email waitlist
│   │   └── unsubscribe/      # One-click unsubscribe
│   ├── review/[token]/       # Internal tool review flow
│   ├── layout.tsx            # Root layout + viewport + fonts
│   └── page.tsx              # Home page
├── components/
│   ├── SearchBar.tsx          # Job title input + quick-role dropdown
│   ├── ResultsSection.tsx     # Task cards + tool results
│   ├── TaskCard.tsx           # Individual task with tool list
│   ├── TrendingPanel.tsx      # Desktop sidebar
│   ├── TrendingDrawer.tsx     # Mobile bottom drawer
│   ├── SearchFilters.tsx      # Free-only toggle
│   └── SubscribeForm.tsx      # Email capture
├── lib/
│   ├── prompts.ts             # System + user prompts for both LLM phases
│   ├── roleAliases.ts         # Maps synonyms (e.g. "PM") to canonical roles
│   ├── roleCache.ts           # Supabase read/write for role_cache
│   ├── toolsCache.ts          # Supabase read/write for tools_cache
│   └── supabase.ts            # Supabase client (null if env vars absent)
└── services/
    ├── llm/
    │   ├── anthropic.ts       # AnthropicProvider: analyzeRole + getToolsForTask
    │   ├── index.ts           # getProvider() factory
    │   └── types.ts           # LLMProvider interface, ModelTier, response types
    └── pipeline/              # Internal content pipeline (discover, verify, synthesize)
```

---

## License

MIT
