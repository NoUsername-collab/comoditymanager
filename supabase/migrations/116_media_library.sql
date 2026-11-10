-- 116 — The property's photo library: one place for every photo, used wherever it fits.
--
-- A photo belongs to an album (exterior, rooms, common areas, the area, food,
-- other) and, when it shows a room, to a room type. The site's rooms section,
-- the booking form and the guest app read room photos from here by room type.
--
-- Moved in: the room photos the site's rooms section kept (payload items'
-- imageUrl) and the unused per-room image (rooms.image_url). The gallery
-- section keeps its own photos until it is rebuilt on the library.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  url text not null check (char_length(url) between 1 and 2048),
  album text not null default 'other'
    check (album in ('exterior', 'rooms', 'common', 'area', 'food', 'other')),
  room_type_id uuid references public.room_type_definitions(id) on delete set null,
  -- What the photo shows, per language (for screen readers and search engines).
  alt jsonb not null default '{}'::jsonb,
  -- Where the photo's subject is, 0–1 from the left and the top; crops keep it in view.
  focal_x real not null default 0.5 check (focal_x between 0 and 1),
  focal_y real not null default 0.5 check (focal_y between 0 and 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_assets_tenant_album_idx
  on public.media_assets (tenant_id, album, sort_order);
create index if not exists media_assets_tenant_room_type_idx
  on public.media_assets (tenant_id, room_type_id, sort_order)
  where room_type_id is not null;

alter table public.media_assets enable row level security;

drop policy if exists tenant_isolation_media_assets on public.media_assets;
create policy tenant_isolation_media_assets
  on public.media_assets
  for all
  using (public.tenant_row_visible(tenant_id))
  with check (public.tenant_row_visible(tenant_id));

comment on table public.media_assets is
  'Biblioteca de poze a pensiunii: album, tip de cameră, descriere pe limbi. Site-ul, formularul de rezervare și aplicația oaspeților le citesc de aici.';

-- ── Move existing room photos in ──

-- From the site's rooms section: one photo per room type.
insert into public.media_assets (tenant_id, url, album, room_type_id, sort_order)
select s.tenant_id,
       item->>'imageUrl',
       'rooms',
       t.id,
       0
from public.public_site_sections s
cross join lateral jsonb_array_elements(coalesce(s.payload->'items', '[]'::jsonb)) as item
left join public.room_type_definitions t
  on t.tenant_id = s.tenant_id
 and t.id::text = item->>'roomTypeId'
where s.section_type = 'stays'
  and coalesce(item->>'imageUrl', '') <> '';

-- From the per-room image, under the room's type; a photo already moved is not repeated.
insert into public.media_assets (tenant_id, url, album, room_type_id, sort_order)
select distinct on (r.tenant_id, r.image_url)
       r.tenant_id,
       r.image_url,
       'rooms',
       r.room_type_definition_id,
       1
from public.rooms r
where coalesce(r.image_url, '') <> ''
  and not exists (
    select 1 from public.media_assets m
    where m.tenant_id = r.tenant_id and m.url = r.image_url
  );

-- The rooms section no longer keeps photos; its words per room type stay.
update public.public_site_sections s
set payload = jsonb_set(
  s.payload,
  '{items}',
  (
    select coalesce(jsonb_agg(item - 'imageUrl'), '[]'::jsonb)
    from jsonb_array_elements(s.payload->'items') as item
  )
)
where s.section_type = 'stays'
  and jsonb_typeof(s.payload->'items') = 'array';

-- The per-room image is now a library photo under the room's type.
alter table public.rooms drop column if exists image_url;
