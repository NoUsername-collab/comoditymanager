-- 113 — Public site: rooms and map become sections the operator can move.
-- They were fixed blocks after the operator's sections, switched by flags in
-- `chrome` (showStayOffers, showStayPrices, showPlace). Each saved site now gets
-- a "stays" and a "place" section carrying those settings, placed where the
-- blocks used to render (after the other sections, before the closing band),
-- and the flags leave `chrome`.

alter table public.public_site_sections
  drop constraint if exists public_site_sections_section_type_check;

alter table public.public_site_sections
  add constraint public_site_sections_section_type_check
  check (section_type in ('intro', 'benefits', 'gallery', 'text', 'cta', 'steps', 'stays', 'place'));

insert into public.public_site_sections (tenant_id, section_type, sort_order, visible, payload)
select
  settings.tenant_id,
  'stays',
  coalesce(last_section.sort_order, 0) + 1,
  coalesce((settings.chrome ->> 'showStayOffers')::boolean, true),
  jsonb_build_object(
    'showPrices', coalesce((settings.chrome ->> 'showStayPrices')::boolean, true)
  )
from public.public_site_settings settings
left join lateral (
  select max(sort_order) as sort_order
  from public.public_site_sections section
  where section.tenant_id = settings.tenant_id
    and section.section_type <> 'cta'
) last_section on true
where not exists (
  select 1 from public.public_site_sections section
  where section.tenant_id = settings.tenant_id and section.section_type = 'stays'
);

insert into public.public_site_sections (tenant_id, section_type, sort_order, visible, payload)
select
  settings.tenant_id,
  'place',
  stays.sort_order + 1,
  coalesce((settings.chrome ->> 'showPlace')::boolean, true),
  '{}'::jsonb
from public.public_site_settings settings
join public.public_site_sections stays
  on stays.tenant_id = settings.tenant_id and stays.section_type = 'stays'
where not exists (
  select 1 from public.public_site_sections section
  where section.tenant_id = settings.tenant_id and section.section_type = 'place'
);

update public.public_site_settings
set chrome = chrome - 'showStayOffers' - 'showStayPrices' - 'showPlace'
where chrome ?| array['showStayOffers', 'showStayPrices', 'showPlace'];
