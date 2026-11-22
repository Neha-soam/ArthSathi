-- Phase 3: recurring transactions. Run ONCE in Supabase SQL Editor (also appended to schema.sql for fresh setups).
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  type text not null check (type in ('income','expense')),
  amount numeric(14,2) not null check (amount > 0 and amount < 1000000000),
  category text not null check (category in ('Food','Travel','Shopping','Education','Bills','Healthcare','Salary','Other')),
  note text check (char_length(note) <= 200),
  day_of_month int not null check (day_of_month between 1 and 31),
  start_date date not null default current_date,
  last_generated date,
  active boolean not null default true,
  created_at timestamptz default now()
);
alter table public.transactions add column if not exists recurring_id uuid references public.recurring_rules(id) on delete set null;
-- One generated transaction per rule per date (NULL recurring_id rows are unaffected). Makes generation safe to repeat.
alter table public.transactions drop constraint if exists transactions_recurring_once;
alter table public.transactions add constraint transactions_recurring_once unique (recurring_id, date);
alter table public.recurring_rules enable row level security;
drop policy if exists "own rows" on public.recurring_rules;
create policy "own rows" on public.recurring_rules for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.recurring_rules to authenticated;
