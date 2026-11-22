-- ArthSathi schema. Run in Supabase SQL Editor. RLS is enabled on every table.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) <= 100),
  created_at timestamptz default now()
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  type text not null check (type in ('income','expense')),
  amount numeric(14,2) not null check (amount > 0 and amount < 1000000000),
  category text not null check (category in ('Food','Travel','Shopping','Education','Bills','Healthcare','Salary','Other')),
  note text check (char_length(note) <= 200),
  date date not null default current_date,
  created_at timestamptz default now()
);
create index on public.transactions (user_id, date desc);
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  category text not null check (category in ('Food','Travel','Shopping','Education','Bills','Healthcare','Other')),
  monthly_limit numeric(14,2) not null check (monthly_limit > 0),
  unique (user_id, category)
);
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) <= 100),
  target_amount numeric(14,2) not null check (target_amount > 0),
  saved_amount numeric(14,2) not null default 0 check (saved_amount >= 0)
);
create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  symbol text not null check (symbol ~ '^[A-Za-z0-9.&-]{1,20}$'),
  unique (user_id, symbol)
);
create table public.paper_portfolios (  -- simulated only, no real money
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  symbol text not null check (symbol ~ '^[A-Za-z0-9.&-]{1,20}$'),
  quantity numeric not null check (quantity > 0),
  buy_price numeric not null check (buy_price > 0)
);
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  action text not null,
  created_at timestamptz default now()
);
create index on public.ai_usage (user_id, created_at desc);

-- RLS: every table, own rows only
do $$ declare t text; begin
  foreach t in array array['transactions','budgets','savings_goals','watchlists','paper_portfolios'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
alter table public.ai_usage enable row level security;
create policy "own usage read" on public.ai_usage for select to authenticated using (user_id = auth.uid());
create policy "own usage insert" on public.ai_usage for insert to authenticated with check (user_id = auth.uid());

-- Auto-create profile on signup
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles (id) values (new.id); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Table access for logged-in users (RLS above still restricts rows to the owner)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.transactions, public.budgets, public.savings_goals, public.watchlists, public.paper_portfolios to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert on public.ai_usage to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Phase 3: recurring transactions
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
