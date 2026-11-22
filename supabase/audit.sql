-- Run in SQL Editor to audit security setup. Expect: every table rls_enabled = true and each has policies using auth.uid().
select c.relname as table, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' order by 1;
select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' order by tablename;
-- Anon role must have NO policies (should return 0 rows):
select tablename, policyname from pg_policies where schemaname = 'public' and 'anon' = any(roles);
