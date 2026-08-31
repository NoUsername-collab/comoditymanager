-- Drop the simulation sandbox and RPCs.
-- Historical 023_simulation.sql / 024_simulation_schema.sql stay as record.

drop schema if exists sim_sandbox cascade;

drop function if exists public.sim_start();
drop function if exists public.sim_stop();
drop function if exists public.sim_is_active();
drop function if exists public.sim_force_cleanup();
drop function if exists public.sim_advance(date);

-- Leftover in-place backup tables from 023 (if a session was left mid-sim).
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename like '_sim_backup_%'
  loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
end $$;
