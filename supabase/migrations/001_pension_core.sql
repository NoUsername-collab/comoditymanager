-- =============================================================================
-- Lecția 1 — Casa Emil v0.1
-- Tabele: setări pensiune, clădiri, etaje (opțional), camere
-- Rulează în Supabase → SQL Editor → New query → Paste → Run
-- =============================================================================

-- Extensie pentru UUID (de obicei e deja activă pe Supabase)
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. pension_settings
--    O singură „fișă” a pensiunii: ore implicite + plafon paturi suplimentare.
--    Nu e hardcodat în cod — admin poate modifica din app mai târziu.
-- -----------------------------------------------------------------------------
create table if not exists public.pension_settings (
  id uuid primary key default gen_random_uuid(),

  -- Nume afișat (ex. Pensiunea din Tasnad)
  display_name text not null default 'Casa Emil',

  -- Ore implicite pentru calcul conflict (check-out dimineața, check-in după-amiaza)
  default_check_in_time  time not null default '14:00',
  default_check_out_time time not null default '11:00',

  -- Plafon GLOBAL: câte paturi suplimentare pot fi folosite ÎN ACEEAȘI noapte
  -- la TOATE rezervările împreună (setabil de admin)
  total_extra_beds_max integer not null default 2
    check (total_extra_beds_max >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pension_settings is
  'Setări pensiune (singleton): ore check-in/out, plafon paturi extra.';

-- -----------------------------------------------------------------------------
-- 2. buildings
--    Clădiri diferite (ex. clădire cu AC, clădire fără AC).
-- -----------------------------------------------------------------------------
create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  sort_order integer not null default 0,

  -- Culoare în Gantt / legendă (opțional), ex. #22c55e
  color_hex text,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.buildings is 'Clădiri configurabile; nu sunt hardcodate în app.';

-- -----------------------------------------------------------------------------
-- 3. floors
--    Etaje opționale — doar dacă clădirea are etaj.
--    Dacă nu are, camerele au floor_id = NULL.
-- -----------------------------------------------------------------------------
create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),

  building_id uuid not null references public.buildings (id) on delete cascade,

  name text not null,
  -- Număr etaj pentru sortare (0 = parter, 1 = etaj 1, ...)
  level_number integer,
  sort_order integer not null default 0,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.floors is 'Etaje per clădire; opțional.';

-- -----------------------------------------------------------------------------
-- 4. rooms
--    Camere — create din app, nu în cod.
-- -----------------------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),

  building_id uuid not null references public.buildings (id) on delete restrict,
  floor_id uuid references public.floors (id) on delete set null,

  name text not null,

  -- Tip cameră: v0.1 duble; mai târziu triple, deluxe
  room_type text not null default 'double'
    check (room_type in ('double', 'triple', 'deluxe', 'other')),

  -- Câți adulți fără pat suplimentar (dublă = 2)
  capacity_base integer not null default 2
    check (capacity_base >= 1),

  allows_extra_beds boolean not null default false,
  max_extra_beds_per_room integer not null default 0
    check (max_extra_beds_per_room >= 0 and max_extra_beds_per_room <= 4),

  has_ac boolean not null default false,
  price_per_night numeric(10, 2) not null default 0,

  description text,
  image_url text,

  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Dacă nu permite paturi, max trebuie să fie 0
  constraint rooms_extra_beds_consistency check (
    (allows_extra_beds = false and max_extra_beds_per_room = 0)
    or (allows_extra_beds = true and max_extra_beds_per_room >= 1)
  )
);

comment on table public.rooms is
  'Camere: capacitate, AC, paturi suplimentare permise per cameră.';

create index if not exists rooms_building_id_idx on public.rooms (building_id);
create index if not exists rooms_floor_id_idx on public.rooms (floor_id);

-- -----------------------------------------------------------------------------
-- Trigger simplu: updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pension_settings_updated_at on public.pension_settings;
create trigger pension_settings_updated_at
  before update on public.pension_settings
  for each row execute function public.set_updated_at();

drop trigger if exists buildings_updated_at on public.buildings;
create trigger buildings_updated_at
  before update on public.buildings
  for each row execute function public.set_updated_at();

drop trigger if exists floors_updated_at on public.floors;
create trigger floors_updated_at
  before update on public.floors
  for each row execute function public.set_updated_at();

drop trigger if exists rooms_updated_at on public.rooms;
create trigger rooms_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Date de test (idempotent — safe la re-run)
-- -----------------------------------------------------------------------------
insert into public.pension_settings (display_name, total_extra_beds_max)
select 'Casa Emil - Tasnad', 2
where not exists (select 1 from public.pension_settings limit 1);

insert into public.buildings (name, sort_order, color_hex)
select 'Clădire AC', 1, '#22c55e'
where not exists (select 1 from public.buildings where name = 'Clădire AC');

insert into public.buildings (name, sort_order, color_hex)
select 'Clădire fără AC', 2, '#3b82f6'
where not exists (select 1 from public.buildings where name = 'Clădire fără AC');

insert into public.floors (building_id, name, level_number, sort_order)
select b.id, 'Parter', 0, 1
from public.buildings b
where b.name = 'Clădire AC'
  and not exists (
    select 1 from public.floors f
    where f.building_id = b.id and f.name = 'Parter'
  );

insert into public.floors (building_id, name, level_number, sort_order)
select b.id, 'Etaj 1', 1, 2
from public.buildings b
where b.name = 'Clădire AC'
  and not exists (
    select 1 from public.floors f
    where f.building_id = b.id and f.name = 'Etaj 1'
  );

insert into public.rooms (
  building_id, floor_id, name, room_type, capacity_base,
  allows_extra_beds, max_extra_beds_per_room, has_ac, price_per_night, sort_order
)
select
  b.id,
  f.id,
  'Camera 1',
  'double',
  2,
  true,
  1,
  true,
  250,
  1
from public.buildings b
join public.floors f on f.building_id = b.id and f.name = 'Parter'
where b.name = 'Clădire AC'
  and not exists (
    select 1 from public.rooms r
    where r.building_id = b.id and r.name = 'Camera 1'
  );
