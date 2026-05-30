-- ═══════════════════════════════════════════════════════════════════════
-- Simulation v2: Schema-based sandbox
--
-- Instead of backing up tables in-place (risky), this creates a full
-- copy of all business tables in a separate 'sim_sandbox' schema.
-- The app's Supabase client targets sim_sandbox during simulation.
-- Real data in 'public' is NEVER modified.
--
-- Start: CREATE SCHEMA sim_sandbox + copy all tables with data/FKs
-- Stop:  DROP SCHEMA sim_sandbox CASCADE (instant, clean)
-- ═══════════════════════════════════════════════════════════════════════

-- Drop old simulation functions (v1 backup approach)
drop function if exists public.sim_start();
drop function if exists public.sim_stop();
drop function if exists public.sim_is_active();
drop function if exists public.sim_force_cleanup();
drop function if exists public.sim_advance(date);

-- ─── Start simulation ─────────────────────────────────────────────────

create or replace function public.sim_start()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Guard: don't start if sandbox already exists
  if exists (
    select 1 from information_schema.schemata
    where schema_name = 'sim_sandbox'
  ) then
    raise exception 'Simulation already active — sim_sandbox schema exists.';
  end if;

  create schema sim_sandbox;

  -- ── Phase 1: Create tables (structure + indexes + constraints) ──
  create table sim_sandbox.pension_settings     (like public.pension_settings     including all);
  create table sim_sandbox.buildings            (like public.buildings            including all);
  create table sim_sandbox.room_option_definitions (like public.room_option_definitions including all);
  create table sim_sandbox.room_type_definitions   (like public.room_type_definitions   including all);
  create table sim_sandbox.floors               (like public.floors               including all);
  create table sim_sandbox.rooms                (like public.rooms                including all);
  create table sim_sandbox.room_type_default_options (like public.room_type_default_options including all);
  create table sim_sandbox.building_option_policies  (like public.building_option_policies  including all);
  create table sim_sandbox.room_enabled_options      (like public.room_enabled_options      including all);
  create table sim_sandbox.guests               (like public.guests               including all);
  create table sim_sandbox.bookings             (like public.bookings             including all);
  create table sim_sandbox.booking_rooms        (like public.booking_rooms        including all);
  create table sim_sandbox.booking_room_segments (like public.booking_room_segments including all);
  create table sim_sandbox.room_holds           (like public.room_holds           including all);
  create table sim_sandbox.room_blocks          (like public.room_blocks          including all);
  create table sim_sandbox.guest_profiles       (like public.guest_profiles       including all);
  create table sim_sandbox.guest_stay_reviews   (like public.guest_stay_reviews   including all);
  create table sim_sandbox.admin_activity_log   (like public.admin_activity_log   including all);

  -- ── Phase 2: Copy data (triggers disabled) ──
  set local session_replication_role = 'replica';

  insert into sim_sandbox.pension_settings      select * from public.pension_settings;
  insert into sim_sandbox.buildings             select * from public.buildings;
  insert into sim_sandbox.room_option_definitions select * from public.room_option_definitions;
  insert into sim_sandbox.room_type_definitions  select * from public.room_type_definitions;
  insert into sim_sandbox.floors                select * from public.floors;
  insert into sim_sandbox.rooms                 select * from public.rooms;
  insert into sim_sandbox.room_type_default_options select * from public.room_type_default_options;
  insert into sim_sandbox.building_option_policies select * from public.building_option_policies;
  insert into sim_sandbox.room_enabled_options   select * from public.room_enabled_options;
  insert into sim_sandbox.guests                select * from public.guests;
  insert into sim_sandbox.bookings              select * from public.bookings;
  insert into sim_sandbox.booking_rooms         select * from public.booking_rooms;
  insert into sim_sandbox.booking_room_segments select * from public.booking_room_segments;
  insert into sim_sandbox.room_holds            select * from public.room_holds;
  insert into sim_sandbox.room_blocks           select * from public.room_blocks;
  insert into sim_sandbox.guest_profiles        select * from public.guest_profiles;
  insert into sim_sandbox.guest_stay_reviews    select * from public.guest_stay_reviews;
  insert into sim_sandbox.admin_activity_log    select * from public.admin_activity_log;

  -- ── Phase 3: Foreign keys (LIKE doesn't copy cross-table FKs) ──

  -- floors
  alter table sim_sandbox.floors
    add constraint fk_floors_building
    foreign key (building_id) references sim_sandbox.buildings (id) on delete cascade;

  -- rooms
  alter table sim_sandbox.rooms
    add constraint fk_rooms_building
    foreign key (building_id) references sim_sandbox.buildings (id) on delete restrict;
  alter table sim_sandbox.rooms
    add constraint fk_rooms_floor
    foreign key (floor_id) references sim_sandbox.floors (id) on delete set null;
  alter table sim_sandbox.rooms
    add constraint fk_rooms_type
    foreign key (room_type_definition_id) references sim_sandbox.room_type_definitions (id) on delete set null;

  -- room catalog
  alter table sim_sandbox.room_type_default_options
    add constraint fk_rtdo_type
    foreign key (room_type_id) references sim_sandbox.room_type_definitions (id) on delete cascade;
  alter table sim_sandbox.room_type_default_options
    add constraint fk_rtdo_option
    foreign key (option_id) references sim_sandbox.room_option_definitions (id) on delete cascade;

  alter table sim_sandbox.building_option_policies
    add constraint fk_bop_building
    foreign key (building_id) references sim_sandbox.buildings (id) on delete cascade;
  alter table sim_sandbox.building_option_policies
    add constraint fk_bop_option
    foreign key (option_id) references sim_sandbox.room_option_definitions (id) on delete cascade;

  alter table sim_sandbox.room_enabled_options
    add constraint fk_reo_room
    foreign key (room_id) references sim_sandbox.rooms (id) on delete cascade;
  alter table sim_sandbox.room_enabled_options
    add constraint fk_reo_option
    foreign key (option_id) references sim_sandbox.room_option_definitions (id) on delete cascade;

  -- bookings & guests
  alter table sim_sandbox.bookings
    add constraint fk_bookings_guest
    foreign key (guest_id) references sim_sandbox.guests (id) on delete set null;

  alter table sim_sandbox.booking_rooms
    add constraint fk_br_booking
    foreign key (booking_id) references sim_sandbox.bookings (id) on delete cascade;
  alter table sim_sandbox.booking_rooms
    add constraint fk_br_room
    foreign key (room_id) references sim_sandbox.rooms (id) on delete restrict;

  alter table sim_sandbox.booking_room_segments
    add constraint fk_brs_booking
    foreign key (booking_id) references sim_sandbox.bookings (id) on delete cascade;
  alter table sim_sandbox.booking_room_segments
    add constraint fk_brs_room
    foreign key (room_id) references sim_sandbox.rooms (id) on delete restrict;

  alter table sim_sandbox.room_holds
    add constraint fk_rh_room
    foreign key (room_id) references sim_sandbox.rooms (id) on delete cascade;

  alter table sim_sandbox.room_blocks
    add constraint fk_rb_room
    foreign key (room_id) references sim_sandbox.rooms (id) on delete cascade;

  alter table sim_sandbox.guest_profiles
    add constraint fk_gp_guest
    foreign key (guest_id) references sim_sandbox.guests (id) on delete cascade;

  alter table sim_sandbox.guest_stay_reviews
    add constraint fk_gsr_booking
    foreign key (booking_id) references sim_sandbox.bookings (id) on delete cascade;
  alter table sim_sandbox.guest_stay_reviews
    add constraint fk_gsr_guest
    foreign key (guest_id) references sim_sandbox.guests (id) on delete cascade;

  -- ── Phase 4: Triggers (updated_at) — call public.set_updated_at() ──
  create trigger set_updated_at before update on sim_sandbox.pension_settings
    for each row execute function public.set_updated_at();
  create trigger set_updated_at before update on sim_sandbox.buildings
    for each row execute function public.set_updated_at();
  create trigger set_updated_at before update on sim_sandbox.floors
    for each row execute function public.set_updated_at();
  create trigger set_updated_at before update on sim_sandbox.rooms
    for each row execute function public.set_updated_at();
  create trigger set_updated_at before update on sim_sandbox.bookings
    for each row execute function public.set_updated_at();
  create trigger set_updated_at before update on sim_sandbox.guests
    for each row execute function public.set_updated_at();
  create trigger set_updated_at before update on sim_sandbox.booking_room_segments
    for each row execute function public.set_updated_at();
  create trigger set_updated_at before update on sim_sandbox.guest_profiles
    for each row execute function public.set_updated_at();
  create trigger set_updated_at before update on sim_sandbox.guest_stay_reviews
    for each row execute function public.set_updated_at();

  -- Done: session_replication_role resets automatically (SET LOCAL)
end;
$$;

-- ─── Stop simulation ──────────────────────────────────────────────────

create or replace function public.sim_stop()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from information_schema.schemata
    where schema_name = 'sim_sandbox'
  ) then
    raise exception 'No simulation active — sim_sandbox schema does not exist.';
  end if;

  drop schema sim_sandbox cascade;
end;
$$;

-- ─── Check if simulation is active ───────────────────────────────────

create or replace function public.sim_is_active()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from information_schema.schemata
    where schema_name = 'sim_sandbox'
  );
end;
$$;

-- ─── Emergency cleanup ───────────────────────────────────────────────

create or replace function public.sim_force_cleanup()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  drop schema if exists sim_sandbox cascade;
end;
$$;

-- ─── Advance simulation ──────────────────────────────────────────────

create or replace function public.sim_advance(p_new_today date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checked_in  int := 0;
  v_checked_out int := 0;
  v_holds_expired int := 0;
begin
  -- Must have active simulation
  if not exists (
    select 1 from information_schema.schemata
    where schema_name = 'sim_sandbox'
  ) then
    raise exception 'Simulation is not active.';
  end if;

  -- 1) Auto check-in: confirmed bookings whose check_in ≤ new_today
  update sim_sandbox.bookings
  set
    actual_check_in_at = (check_in || 'T14:00:00')::timestamptz::text,
    actual_check_in_by = 'sim'
  where status = 'confirmata'
    and check_in <= p_new_today::text
    and actual_check_in_at is null;
  get diagnostics v_checked_in = row_count;

  -- 2) Auto check-out: checked-in bookings whose check_out ≤ new_today
  update sim_sandbox.bookings
  set
    actual_check_out_at = (check_out || 'T11:00:00')::timestamptz::text,
    actual_check_out_by = 'sim'
  where status = 'confirmata'
    and check_out <= p_new_today::text
    and actual_check_in_at is not null
    and actual_check_out_at is null;
  get diagnostics v_checked_out = row_count;

  -- 3) Release expired holds
  update sim_sandbox.room_holds
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

-- ─── Clean up any orphaned v1 backup tables ──────────────────────────

do $$
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

-- ─── Comments ────────────────────────────────────────────────────────

comment on function public.sim_start is
  'Starts simulation: creates sim_sandbox schema with full copy of all business tables. Real data is never modified.';

comment on function public.sim_stop is
  'Stops simulation: DROP SCHEMA sim_sandbox CASCADE. Instant, clean, zero risk.';

comment on function public.sim_is_active is
  'Returns true if sim_sandbox schema exists (simulation is active).';

comment on function public.sim_force_cleanup is
  'Emergency: drops sim_sandbox schema if it exists.';

comment on function public.sim_advance is
  'Advances simulation: auto check-in/check-out bookings and expire holds in sim_sandbox up to the given date.';
