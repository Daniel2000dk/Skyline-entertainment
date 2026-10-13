-- Schema-wide guarantees, so new tables/functions cannot silently weaken them.
begin;
select plan(6);

select is(
  (select coalesce(array_agg(tablename::text order by tablename), '{}')
   from pg_tables where schemaname = 'public' and not rowsecurity),
  '{}'::text[],
  'every table in the public schema has RLS enabled'
);

select is(
  (select coalesce(array_agg(distinct table_name::text), '{}')
   from information_schema.role_table_grants
   where grantee = 'anon' and table_schema = 'public'),
  '{}'::text[],
  'anon has no table privileges in the public schema'
);

select is(
  (select coalesce(array_agg(distinct table_name::text), '{}')
   from information_schema.column_privileges
   where grantee = 'anon' and table_schema = 'public'),
  '{}'::text[],
  'anon has no column privileges in the public schema'
);

-- Public read functions for anon get whitelisted here when phase C adds them.
select is(
  (select coalesce(array_agg(p.proname::text order by p.proname), '{}')
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')),
  '{}'::text[],
  'anon cannot execute any function in the public schema'
);

select is(
  (select coalesce(array_agg(n.nspname || '.' || p.proname order by p.proname), '{}')
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and p.prosecdef
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  '{}'::text[],
  'every security definer function pins its search_path'
);

select ok(
  not has_schema_privilege('anon', 'private', 'usage'),
  'anon cannot use the private schema'
);

select * from finish();
rollback;
