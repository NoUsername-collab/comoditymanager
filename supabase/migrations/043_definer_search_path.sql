-- Pin search_path on all SECURITY DEFINER functions in public (search_path injection hardening).
-- Idempotent: safe to re-run; overwrites search_path to public for every definer in schema.

do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as func_name,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public',
      fn.schema_name,
      fn.func_name,
      fn.args
    );
  end loop;
end $$;
