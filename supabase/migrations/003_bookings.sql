-- Rezervări + legătură camere (multi-cameră)

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),

  check_in date not null,
  check_out date not null,

  status text not null default 'cerere_noua'
    check (status in ('cerere_noua', 'confirmata', 'anulata')),

  guest_name text not null,
  guest_email text not null,
  guest_phone text,

  num_adults integer not null default 1 check (num_adults >= 1),
  num_children integer not null default 0 check (num_children >= 0),
  has_minor boolean not null default false,
  minor_age text,

  notes text,
  total_price numeric(10, 2),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bookings_min_one_night check (check_out > check_in)
);

create table if not exists public.booking_rooms (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete restrict,
  extra_beds integer not null default 0 check (extra_beds >= 0),
  unique (booking_id, room_id)
);

create index if not exists bookings_dates_idx on public.bookings (check_in, check_out);
create index if not exists booking_rooms_room_idx on public.booking_rooms (room_id);

drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();
