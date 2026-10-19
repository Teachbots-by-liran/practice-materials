-- Word Quest database. Run once in Supabase: SQL Editor → New query → paste → Run.
--
-- Everything is stored as JSON rows in one table. Only the website's server can read
-- or write it (with the service role key): row level security is on and there are no
-- policies, so the public "anon" key can't see anything.

create table if not exists public.wq_rows (
  collection text not null,
  id text not null,
  class_id text,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

create index if not exists wq_rows_class on public.wq_rows (collection, class_id);

alter table public.wq_rows enable row level security;
