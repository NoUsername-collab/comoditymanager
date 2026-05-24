-- =============================================================================
-- 015 — Catalog modular: tipuri cameră, opțiuni (AC, frigider…), politici clădire
-- =============================================================================

create table if not exists public.room_option_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  price_per_night_addon numeric(10, 2) not null default 0,
  sort_order integer not null default 0,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.room_option_definitions is
  'Opțiuni modulare cameră (AC, frigider, …) — extensibile de admin.';

create table if not exists public.room_type_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  capacity_base integer not null default 2 check (capacity_base >= 1),
  base_price_per_night numeric(10, 2) not null default 0,
  sort_order integer not null default 0,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.room_type_definitions is
  'Tipuri cameră (twin, double, triple, custom) — preț bază per tip.';

create table if not exists public.room_type_default_options (
  room_type_id uuid not null references public.room_type_definitions (id) on delete cascade,
  option_id uuid not null references public.room_option_definitions (id) on delete cascade,
  primary key (room_type_id, option_id)
);

comment on table public.room_type_default_options is
  'Opțiuni incluse implicit la un tip de cameră.';

create table if not exists public.building_option_policies (
  building_id uuid not null references public.buildings (id) on delete cascade,
  option_id uuid not null references public.room_option_definitions (id) on delete cascade,
  mode text not null default 'per_room'
    check (mode in ('all_rooms', 'none', 'per_room')),
  primary key (building_id, option_id)
);

comment on table public.building_option_policies is
  'Politică per clădire per opțiune: toate camerele / niciuna / per cameră.';

create table if not exists public.room_enabled_options (
  room_id uuid not null references public.rooms (id) on delete cascade,
  option_id uuid not null references public.room_option_definitions (id) on delete cascade,
  primary key (room_id, option_id)
);

comment on table public.room_enabled_options is
  'Opțiuni active pe cameră când politica clădirii este per_room.';

-- Seed opțiuni sistem
insert into public.room_option_definitions (slug, name, price_per_night_addon, sort_order, is_system)
values
  ('ac', 'Aer condiționat', 0, 10, true),
  ('fridge', 'Frigider', 0, 20, true)
on conflict (slug) do nothing;

-- Seed tipuri sistem
insert into public.room_type_definitions (slug, name, capacity_base, base_price_per_night, sort_order, is_system)
values
  ('twin', 'Twin', 2, 0, 10, true),
  ('double', 'Double', 2, 0, 20, true),
  ('triple', 'Triple', 3, 0, 30, true)
on conflict (slug) do nothing;

-- Legătură opțională cameră → tip catalog (pe lângă room_type text legacy)
alter table public.rooms
  add column if not exists room_type_definition_id uuid
  references public.room_type_definitions (id) on delete set null;

create index if not exists rooms_room_type_definition_id_idx
  on public.rooms (room_type_definition_id);
