-- Phase 4: scan history. Run ONCE in Supabase SQL Editor (also appended to schema.sql for fresh setups).
-- Stores only a MASKED excerpt (4+ digit runs and UPI IDs/emails hidden), never the full message.
create table if not exists public.scam_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  level text not null check (level in ('Low','Medium','High')),
  score int not null check (score between 0 and 100),
  signals text[] not null default '{}' check (cardinality(signals) <= 30),
  excerpt text not null check (char_length(excerpt) <= 200),
  ai_used boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists scam_checks_user_created on public.scam_checks (user_id, created_at desc);
alter table public.scam_checks enable row level security;
drop policy if exists "own rows" on public.scam_checks;
create policy "own rows" on public.scam_checks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.scam_checks to authenticated; -- no UPDATE: history entries are immutable
