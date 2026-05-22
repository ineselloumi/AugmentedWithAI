create table if not exists role_cache (
  role        text primary key,
  data        jsonb        not null,
  cached_at   timestamptz  not null default now()
);
