-- Enable Row Level Security on all tables and add a default deny-all policy.
--
-- The server uses the SUPABASE_SERVICE_ROLE_KEY which bypasses RLS by design,
-- so all existing functionality keeps working. This migration is defense in
-- depth: if the Supabase URL is ever accessed with the anon key (e.g. via a
-- leaked env var, browser inspection, or accidental client-side use), no data
-- is exposed.

-- waitlist: emails of subscribers. Must never be readable by the public.
alter table if exists waitlist enable row level security;
drop policy if exists "deny_all_anon" on waitlist;
create policy "deny_all_anon" on waitlist for all to anon using (false) with check (false);

-- role_cache: LLM-generated analysis cached by role.
alter table if exists role_cache enable row level security;
drop policy if exists "deny_all_anon" on role_cache;
create policy "deny_all_anon" on role_cache for all to anon using (false) with check (false);

-- tools_cache: LLM-generated tool recommendations cached by (role, taskId).
alter table if exists tools_cache enable row level security;
drop policy if exists "deny_all_anon" on tools_cache;
create policy "deny_all_anon" on tools_cache for all to anon using (false) with check (false);

-- trending_cache: cached trending-AI report.
alter table if exists trending_cache enable row level security;
drop policy if exists "deny_all_anon" on trending_cache;
create policy "deny_all_anon" on trending_cache for all to anon using (false) with check (false);
