-- Run ONCE in Supabase SQL Editor if you see "permission denied for table ...".
-- RLS still limits every user to their own rows; this only lets the logged-in role reach the tables.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.transactions, public.budgets, public.savings_goals, public.watchlists, public.paper_portfolios to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert on public.ai_usage to authenticated;
grant usage, select on all sequences in schema public to authenticated;
-- Verify (should list the tables above):
select table_name, privilege_type from information_schema.role_table_grants where table_schema = 'public' and grantee = 'authenticated' order by 1, 2;
