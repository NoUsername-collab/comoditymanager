-- Simulation mode: in-place backup for sandbox testing.
--
-- NO configuration needed — works out of the box with any Supabase project.
--
-- Start: creates _sim_backup_* copies of all tables (snapshot of real data)
-- Stop:  restores real data from backups and drops backup tables
--
-- During simulation, the app works normally on the real tables.
-- When you stop, everything reverts to the pre-simulation state.

-- ─── Start simulation (backup all tables) ────────────────────────────────────

create or replace function public.sim_start()
returns void
language plpgsql
security definer
as $$
begin
  -- Safety: don't start if backup tables already exist
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = '_sim_backup_guests'
  ) then
    raise exception 'Simulation already active — backup tables exist. Stop the current simulation first.';
  end if;

  -- Disable triggers during backup to avoid side effects
  set session_replication_role = 'replica';

  -- Backup all tables (structure + data)
  create table public._sim_backup_pension_settings as select * from public.pension_settings;
  create table public._sim_backup_buildings as select * from public.buildings;
  create table public._sim_backup_floors as select * from public.floors;
  create table public._sim_backup_rooms as select * from public.rooms;

  create table public._sim_backup_room_option_definitions as select * from public.room_option_definitions;
  create table public._sim_backup_room_type_definitions as select * from public.room_type_definitions;
  create table public._sim_backup_room_type_default_options as select * from public.room_type_default_options;
  create table public._sim_backup_building_option_policies as select * from public.building_option_policies;
  create table public._sim_backup_room_enabled_options as select * from public.room_enabled_options;

  create table public._sim_backup_bookings as select * from public.bookings;
  create table public._sim_backup_booking_rooms as select * from public.booking_rooms;
  create table public._sim_backup_booking_room_segments as select * from public.booking_room_segments;
  create table public._sim_backup_room_holds as select * from public.room_holds;
  create table public._sim_backup_room_blocks as select * from public.room_blocks;

  create table public._sim_backup_guests as select * from public.guests;
  create table public._sim_backup_guest_profiles as select * from public.guest_profiles;
  create table public._sim_backup_guest_stay_reviews as select * from public.guest_stay_reviews;

  create table public._sim_backup_admin_activity_log as select * from public.admin_activity_log;

  -- Re-enable triggers
  set session_replication_role = 'origin';
end;
$$;

-- ─── Stop simulation (restore from backup) ───────────────────────────────────

create or replace function public.sim_stop()
returns void
language plpgsql
security definer
as $$
begin
  -- Check if backup exists
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = '_sim_backup_guests'
  ) then
    raise exception 'No simulation backup found. Nothing to restore.';
  end if;

  -- Disable triggers and FK checks during restore
  set session_replication_role = 'replica';

  -- Restore in reverse dependency order (children first, then parents)
  -- Activity log
  truncate public.admin_activity_log;
  insert into public.admin_activity_log select * from public._sim_backup_admin_activity_log;

  -- Guest reviews → profiles → guests
  truncate public.guest_stay_reviews;
  insert into public.guest_stay_reviews select * from public._sim_backup_guest_stay_reviews;

  truncate public.guest_profiles;
  insert into public.guest_profiles select * from public._sim_backup_guest_profiles;

  -- Booking segments → rooms → bookings
  truncate public.booking_room_segments;
  insert into public.booking_room_segments select * from public._sim_backup_booking_room_segments;

  truncate public.room_holds;
  insert into public.room_holds select * from public._sim_backup_room_holds;

  truncate public.room_blocks;
  insert into public.room_blocks select * from public._sim_backup_room_blocks;

  truncate public.booking_rooms;
  insert into public.booking_rooms select * from public._sim_backup_booking_rooms;

  truncate public.bookings;
  insert into public.bookings select * from public._sim_backup_bookings;

  -- Guests (after bookings, since bookings reference guests)
  truncate public.guests cascade;
  insert into public.guests select * from public._sim_backup_guests;

  -- Room catalog
  truncate public.room_enabled_options;
  insert into public.room_enabled_options select * from public._sim_backup_room_enabled_options;

  truncate public.building_option_policies;
  insert into public.building_option_policies select * from public._sim_backup_building_option_policies;

  truncate public.room_type_default_options;
  insert into public.room_type_default_options select * from public._sim_backup_room_type_default_options;

  truncate public.room_type_definitions;
  insert into public.room_type_definitions select * from public._sim_backup_room_type_definitions;

  truncate public.room_option_definitions;
  insert into public.room_option_definitions select * from public._sim_backup_room_option_definitions;

  -- Infrastructure (rooms → floors → buildings → settings)
  truncate public.rooms cascade;
  insert into public.rooms select * from public._sim_backup_rooms;

  truncate public.floors cascade;
  insert into public.floors select * from public._sim_backup_floors;

  truncate public.buildings cascade;
  insert into public.buildings select * from public._sim_backup_buildings;

  truncate public.pension_settings;
  insert into public.pension_settings select * from public._sim_backup_pension_settings;

  -- Re-enable triggers
  set session_replication_role = 'origin';

  -- Drop all backup tables
  drop table if exists public._sim_backup_admin_activity_log;
  drop table if exists public._sim_backup_guest_stay_reviews;
  drop table if exists public._sim_backup_guest_profiles;
  drop table if exists public._sim_backup_booking_room_segments;
  drop table if exists public._sim_backup_room_holds;
  drop table if exists public._sim_backup_room_blocks;
  drop table if exists public._sim_backup_booking_rooms;
  drop table if exists public._sim_backup_bookings;
  drop table if exists public._sim_backup_guests;
  drop table if exists public._sim_backup_room_enabled_options;
  drop table if exists public._sim_backup_building_option_policies;
  drop table if exists public._sim_backup_room_type_default_options;
  drop table if exists public._sim_backup_room_type_definitions;
  drop table if exists public._sim_backup_room_option_definitions;
  drop table if exists public._sim_backup_rooms;
  drop table if exists public._sim_backup_floors;
  drop table if exists public._sim_backup_buildings;
  drop table if exists public._sim_backup_pension_settings;
end;
$$;

-- ─── Check if simulation is active ──────────────────────────────────────────

create or replace function public.sim_is_active()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = '_sim_backup_guests'
  );
end;
$$;

-- ─── Emergency cleanup (force drop backups without restoring) ────────────────

create or replace function public.sim_force_cleanup()
returns void
language plpgsql
security definer
as $$
declare
  tbl text;
begin
  for tbl in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name like '_sim_backup_%'
  loop
    execute format('drop table if exists public.%I cascade', tbl);
  end loop;
end;
$$;

-- ─── Advance simulation by N days (process time-dependent events) ────────────

create or replace function public.sim_advance(
  p_new_today date
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_checked_in  int := 0;
  v_checked_out int := 0;
  v_holds_expired int := 0;
begin
  -- Safety: only if simulation is active
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = '_sim_backup_guests'
  ) then
    raise exception 'Simulation is not active. Start a simulation first.';
  end if;

  -- 1) Auto check-in: confirmed bookings whose check_in ≤ new_today
  --    that have not been checked in yet
  update public.bookings
  set
    actual_check_in_at = (check_in || 'T14:00:00')::timestamptz::text,
    actual_check_in_by = 'sim'
  where status = 'confirmata'
    and check_in <= p_new_today::text
    and actual_check_in_at is null;
  get diagnostics v_checked_in = row_count;

  -- 2) Auto check-out: confirmed bookings whose check_out ≤ new_today
  --    that have been checked in but not checked out yet
  update public.bookings
  set
    actual_check_out_at = (check_out || 'T11:00:00')::timestamptz::text,
    actual_check_out_by = 'sim'
  where status = 'confirmata'
    and check_out <= p_new_today::text
    and actual_check_in_at is not null
    and actual_check_out_at is null;
  get diagnostics v_checked_out = row_count;

  -- 3) Release expired holds
  update public.room_holds
  set released_at = now()::text
  where released_at is null
    and expires_at is not null
    and expires_at::timestamptz < (p_new_today::text || 'T00:00:00')::timestamptz;
  get diagnostics v_holds_expired = row_count;

  return jsonb_build_object(
    'checked_in', v_checked_in,
    'checked_out', v_checked_out,
    'holds_expired', v_holds_expired
  );
end;
$$;

comment on function public.sim_start is
  'Starts simulation mode: creates backup copies of all tables. The app operates on real tables during simulation.';

comment on function public.sim_stop is
  'Stops simulation: restores all tables from backup and drops backup tables. All simulation data is lost.';

comment on function public.sim_is_active is
  'Returns true if simulation backup tables exist (simulation is active).';

comment on function public.sim_force_cleanup is
  'Emergency: drops all backup tables without restoring. Use only if sim_stop fails.';

comment on function public.sim_advance is
  'Advances simulation: auto check-in/check-out bookings and expire holds up to the given date.';
