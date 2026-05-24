-- v0.2 Phase 1: occupancy unificat — segmente booking, hold operator, blocări cameră

-- -----------------------------------------------------------------------------
-- 1. booking_room_segments — interval modular per cameră (mutări split viitoare)
-- -----------------------------------------------------------------------------
create table if not exists public.booking_room_segments (
  id uuid primary key default gen_random_uuid(),

  booking_id uuid not null references public.bookings (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete restrict,

  segment_start date not null,
  segment_end date not null,

  nightly_rate numeric(10, 2),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint booking_room_segments_min_one_night check (segment_end > segment_start)
);

comment on table public.booking_room_segments is
  'Segment ocupare per cameră; un booking poate avea mai multe segmente (ex. mutare mid-stay).';

create index if not exists booking_room_segments_room_dates_idx
  on public.booking_room_segments (room_id, segment_start, segment_end);

create index if not exists booking_room_segments_booking_idx
  on public.booking_room_segments (booking_id);

drop trigger if exists booking_room_segments_updated_at on public.booking_room_segments;
create trigger booking_room_segments_updated_at
  before update on public.booking_room_segments
  for each row execute function public.set_updated_at();

-- Backfill din booking_rooms + bookings active
insert into public.booking_room_segments (booking_id, room_id, segment_start, segment_end)
select
  br.booking_id,
  br.room_id,
  b.check_in,
  b.check_out
from public.booking_rooms br
inner join public.bookings b on b.id = br.booking_id
where b.status <> 'anulata';

-- -----------------------------------------------------------------------------
-- 2. room_holds — reținere operator (intern, nu calendar public)
-- -----------------------------------------------------------------------------
create table if not exists public.room_holds (
  id uuid primary key default gen_random_uuid(),

  room_id uuid not null references public.rooms (id) on delete cascade,

  check_in date not null,
  check_out date not null,

  reason text,

  expires_at timestamptz,
  released_at timestamptz,
  released_by text,

  created_at timestamptz not null default now(),
  created_by text,

  constraint room_holds_min_one_night check (check_out > check_in)
);

comment on table public.room_holds is
  'Hold operator: cameră rezervată intern până la eliberare sau expirare (expires_at).';

create index if not exists room_holds_room_dates_idx
  on public.room_holds (room_id, check_in, check_out);

create index if not exists room_holds_active_idx
  on public.room_holds (room_id)
  where released_at is null;

-- -----------------------------------------------------------------------------
-- 3. room_blocks — cameră indisponibilă (mentenanță etc.)
-- -----------------------------------------------------------------------------
create table if not exists public.room_blocks (
  id uuid primary key default gen_random_uuid(),

  room_id uuid not null references public.rooms (id) on delete cascade,

  check_in date not null,
  check_out date not null,

  reason text not null,

  created_at timestamptz not null default now(),
  created_by text,

  constraint room_blocks_min_one_night check (check_out > check_in)
);

comment on table public.room_blocks is
  'Blocare cameră: indisponibilă pe interval (mentenanță, personal).';

create index if not exists room_blocks_room_dates_idx
  on public.room_blocks (room_id, check_in, check_out);
