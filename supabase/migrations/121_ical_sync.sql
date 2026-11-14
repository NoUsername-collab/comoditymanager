-- 121 — Calendar sync with Booking.com, Airbnb and the like (iCal).
--
-- Two directions, per room:
--   * export: each room has a secret address (rooms.ical_export_token) that
--     the other site reads to see the nights already taken in Zalmox;
--   * import: the owner pastes the other site's calendar address
--     (room_ical_feeds); every 15 minutes its reservations become blocks on
--     that room (room_blocks.ical_feed_id / ical_uid), so the calendar, the
--     public site and reception see them as taken.
--
-- Imported blocks belong to their feed: they are updated or removed when the
-- other site changes or cancels the reservation, and go with the feed when it
-- is removed. Blocks typed at reception keep both columns null.

-- ── Export address per room ───────────────────────────────────────────────
-- Two random UUIDs without dashes: 64 hex characters, ~244 random bits.
alter table public.rooms
  add column if not exists ical_export_token text;

update public.rooms
set ical_export_token =
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where ical_export_token is null;

alter table public.rooms
  alter column ical_export_token set default
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  alter column ical_export_token set not null;

create unique index if not exists rooms_ical_export_token_key
  on public.rooms (ical_export_token);

comment on column public.rooms.ical_export_token is
  'Secret part of the room''s iCal export address (/api/ical/<token>.ics). Changing it cuts off every site that reads the old address.';

-- ── Calendars imported per room ───────────────────────────────────────────
create table if not exists public.room_ical_feeds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  url text not null check (url ~ '^https://' and char_length(url) <= 2000),
  last_synced_at timestamptz,
  last_status text check (last_status is null or last_status in ('ok', 'error')),
  last_error text,
  last_event_count integer check (last_event_count is null or last_event_count >= 0),
  -- Reservations from this feed on nights Zalmox had already given away.
  last_conflict_count integer check (last_conflict_count is null or last_conflict_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists room_ical_feeds_room_url
  on public.room_ical_feeds (tenant_id, room_id, url);

create index if not exists room_ical_feeds_tenant
  on public.room_ical_feeds (tenant_id, room_id);

comment on table public.room_ical_feeds is
  'Calendar addresses of other sites (Booking.com, Airbnb…) imported into a room as blocks.';

drop trigger if exists room_ical_feeds_updated_at on public.room_ical_feeds;
create trigger room_ical_feeds_updated_at
  before update on public.room_ical_feeds
  for each row execute function public.set_updated_at();

alter table public.room_ical_feeds enable row level security;

drop policy if exists room_ical_feeds_tenant on public.room_ical_feeds;
create policy room_ical_feeds_tenant on public.room_ical_feeds
  for all
  using (public.tenant_row_visible(tenant_id))
  with check (public.tenant_row_visible(tenant_id));

-- ── Blocks that came from a feed ──────────────────────────────────────────
alter table public.room_blocks
  add column if not exists ical_feed_id uuid references public.room_ical_feeds(id) on delete cascade,
  add column if not exists ical_uid text;

alter table public.room_blocks
  drop constraint if exists room_blocks_ical_pair;
alter table public.room_blocks
  add constraint room_blocks_ical_pair
  check ((ical_feed_id is null) = (ical_uid is null));

create unique index if not exists room_blocks_ical_event
  on public.room_blocks (ical_feed_id, ical_uid)
  where ical_feed_id is not null;

comment on column public.room_blocks.ical_feed_id is
  'The imported calendar this block mirrors; null for blocks typed at reception.';
comment on column public.room_blocks.ical_uid is
  'The reservation''s UID in the imported calendar, to update or remove it on the next sync.';
