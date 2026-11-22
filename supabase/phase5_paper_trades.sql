-- Phase 5: simulated (paper) trading log. NO real money. Run ONCE in Supabase SQL Editor (also appended to schema.sql).
-- Holdings, cash and P&L are derived from this log. The older paper_portfolios table is left untouched and unused.
create table if not exists public.paper_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  symbol text not null check (symbol ~ '^[A-Za-z0-9.&-]{1,20}$'),
  side text not null check (side in ('buy','sell')),
  quantity int not null check (quantity > 0 and quantity <= 1000000),
  price numeric(14,2) not null check (price > 0 and price < 1000000000),
  created_at timestamptz not null default now()
);
create index if not exists paper_trades_user_created on public.paper_trades (user_id, created_at);
alter table public.paper_trades enable row level security;
drop policy if exists "own rows" on public.paper_trades;
create policy "own rows" on public.paper_trades for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.paper_trades to authenticated; -- no UPDATE: trades are immutable; "reset" deletes them
