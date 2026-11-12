-- 118 — The site's own pages and a free menu.
--
-- Besides the first page, a site can have pages of its own (Restaurant,
-- Activities…) at /<slug>, each with a title, a lead, a photo, a search
-- description and the same sections the first page has. A section belongs to
-- one page; none means the first page.
--
-- The header menu becomes a list the operator writes (chrome.menu): links to
-- pages, to sections, to the built-in pages or elsewhere, one level of
-- submenu. The three "show in menu" switches it replaces become its first
-- items, in the order they were shown, and are removed.

create table if not exists public.public_site_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 60)
    check (slug not in (
      'admin', 'api', 'calendar', 'confidentialitate', 'termeni', 'receptie', 'guest', 'stay',
      'landing', 'preturi', 'signup', 'alpha-gate', 'tenant-suspended', 'platform-admin',
      'offline', 'ro', 'en', 'bg'
    )),
  title jsonb not null default '{}'::jsonb,
  lead jsonb not null default '{}'::jsonb,
  seo_description jsonb not null default '{}'::jsonb,
  image_url text check (image_url is null or char_length(image_url) between 1 and 2048),
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index if not exists public_site_pages_tenant_sort_idx
  on public.public_site_pages (tenant_id, sort_order);

alter table public.public_site_pages enable row level security;

drop policy if exists tenant_isolation_public_site_pages on public.public_site_pages;
create policy tenant_isolation_public_site_pages
  on public.public_site_pages
  for all
  using (public.tenant_row_visible(tenant_id))
  with check (public.tenant_row_visible(tenant_id));

drop trigger if exists public_site_pages_updated_at on public.public_site_pages;
create trigger public_site_pages_updated_at
  before update on public.public_site_pages
  for each row execute function public.set_updated_at();

comment on table public.public_site_pages is
  'Paginile proprii ale site-ului (ex. Restaurant), la /<slug>, cu secțiunile lor.';

alter table public.public_site_sections
  add column if not exists page_id uuid references public.public_site_pages(id) on delete cascade;

comment on column public.public_site_sections.page_id is
  'Pagina secțiunii; null pentru prima pagină.';

create index if not exists public_site_sections_page_idx
  on public.public_site_sections (page_id)
  where page_id is not null;

-- ── The menu, from the switches it replaces ──

update public.public_site_settings s
set chrome = (s.chrome - 'showNavHome' - 'showNavPrivacy' - 'showNavTerms')
  || jsonb_build_object(
       'menu',
       (
         select coalesce(jsonb_agg(item order by position), '[]'::jsonb)
         from (
           select 1 as position,
                  jsonb_build_object('id', gen_random_uuid()::text, 'kind', 'home', 'label', '{}'::jsonb) as item
           where coalesce((s.chrome->>'showNavHome')::boolean, true)
           union all
           select 2,
                  jsonb_build_object('id', gen_random_uuid()::text, 'kind', 'privacy', 'label', '{}'::jsonb)
           where coalesce((s.chrome->>'showNavPrivacy')::boolean, true)
           union all
           select 3,
                  jsonb_build_object('id', gen_random_uuid()::text, 'kind', 'terms', 'label', '{}'::jsonb)
           where coalesce((s.chrome->>'showNavTerms')::boolean, false)
         ) items
       )
     )
where not (s.chrome ? 'menu');

-- ── Saving: pages first, then every section with its page ──

drop function if exists public.upsert_public_site_settings_atomic(
  uuid, text, text, boolean, boolean, text, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, integer, jsonb
);

create or replace function public.upsert_public_site_settings_atomic(
  p_tenant_id uuid,
  p_template_id text,
  p_theme_id text,
  p_published boolean,
  p_booking_enabled boolean,
  p_booking_nav_position text,
  p_use_primary_contact boolean,
  p_hero jsonb,
  p_contact jsonb,
  p_seo jsonb,
  p_booking_notice jsonb,
  p_chrome jsonb,
  p_pages jsonb,
  p_sections jsonb,
  -- Version the editor loaded; null when nothing was saved yet.
  p_expected_version integer,
  p_untranslated_copy jsonb,
  -- The site's own pages, each with its id (made by the editor for a new one).
  p_site_pages jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sections jsonb := coalesce(p_sections, '[]'::jsonb);
  v_site_pages jsonb := coalesce(p_site_pages, '[]'::jsonb);
  v_section jsonb;
  v_page jsonb;
  v_index int := 0;
  v_current int;
  v_version int;
  v_ids uuid[];
  v_page_ids uuid[];
begin
  if not public.is_service_role() then
    raise exception 'forbidden';
  end if;

  select version into v_current
  from public.public_site_settings
  where tenant_id = p_tenant_id
  for update;

  if found then
    if p_expected_version is distinct from v_current then
      raise exception 'public_site.version_conflict';
    end if;

    update public.public_site_settings set
      template_id = p_template_id,
      theme_id = p_theme_id,
      published = p_published,
      booking_enabled = p_booking_enabled,
      booking_nav_position = p_booking_nav_position,
      use_primary_contact = coalesce(p_use_primary_contact, true),
      hero = coalesce(p_hero, '{}'::jsonb),
      contact = coalesce(p_contact, '{}'::jsonb),
      seo = coalesce(p_seo, '{}'::jsonb),
      booking_notice = coalesce(p_booking_notice, '{}'::jsonb),
      chrome = coalesce(p_chrome, '{}'::jsonb),
      pages = coalesce(p_pages, '{}'::jsonb),
      untranslated_copy = coalesce(p_untranslated_copy, '{}'::jsonb),
      version = v_current + 1,
      updated_at = now()
    where tenant_id = p_tenant_id
    returning version into v_version;
  else
    if p_expected_version is not null then
      raise exception 'public_site.version_conflict';
    end if;

    insert into public.public_site_settings (
      tenant_id,
      template_id,
      theme_id,
      published,
      booking_enabled,
      booking_nav_position,
      use_primary_contact,
      hero,
      contact,
      seo,
      booking_notice,
      chrome,
      pages,
      untranslated_copy,
      version
    )
    values (
      p_tenant_id,
      p_template_id,
      p_theme_id,
      p_published,
      p_booking_enabled,
      p_booking_nav_position,
      coalesce(p_use_primary_contact, true),
      coalesce(p_hero, '{}'::jsonb),
      coalesce(p_contact, '{}'::jsonb),
      coalesce(p_seo, '{}'::jsonb),
      coalesce(p_booking_notice, '{}'::jsonb),
      coalesce(p_chrome, '{}'::jsonb),
      coalesce(p_pages, '{}'::jsonb),
      coalesce(p_untranslated_copy, '{}'::jsonb),
      1
    )
    on conflict (tenant_id) do nothing
    returning version into v_version;

    -- Someone else created the row between our read and our insert.
    if v_version is null then
      raise exception 'public_site.version_conflict';
    end if;
  end if;

  -- ── Pages ──
  select coalesce(array_agg((value ->> 'id')::uuid), '{}')
  into v_page_ids
  from jsonb_array_elements(v_site_pages);

  if exists (
    select 1 from public.public_site_pages
    where id = any(v_page_ids) and tenant_id <> p_tenant_id
  ) then
    raise exception 'forbidden';
  end if;

  -- A page taken away takes its sections with it.
  delete from public.public_site_pages
  where tenant_id = p_tenant_id
    and not (id = any(v_page_ids));

  -- Slugs may swap between pages in one save: park them first.
  update public.public_site_pages
  set slug = 'x-' || replace(id::text, '-', '')
  where tenant_id = p_tenant_id;

  v_index := 0;
  for v_page in select value from jsonb_array_elements(v_site_pages)
  loop
    insert into public.public_site_pages (
      id, tenant_id, slug, title, lead, seo_description, image_url, visible, sort_order
    )
    values (
      (v_page ->> 'id')::uuid,
      p_tenant_id,
      v_page ->> 'slug',
      coalesce(v_page -> 'title', '{}'::jsonb),
      coalesce(v_page -> 'lead', '{}'::jsonb),
      coalesce(v_page -> 'seo_description', '{}'::jsonb),
      nullif(v_page ->> 'image_url', ''),
      coalesce((v_page ->> 'visible')::boolean, true),
      coalesce((v_page ->> 'sort_order')::int, v_index * 10)
    )
    on conflict (id) do update set
      slug = excluded.slug,
      title = excluded.title,
      lead = excluded.lead,
      seo_description = excluded.seo_description,
      image_url = excluded.image_url,
      visible = excluded.visible,
      sort_order = excluded.sort_order,
      updated_at = now();
    v_index := v_index + 1;
  end loop;

  -- ── Sections ──
  select coalesce(array_agg((value ->> 'id')::uuid), '{}')
  into v_ids
  from jsonb_array_elements(v_sections)
  where nullif(value ->> 'id', '') is not null;

  if exists (
    select 1 from public.public_site_sections
    where id = any(v_ids) and tenant_id <> p_tenant_id
  ) then
    raise exception 'forbidden';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_sections) as section
    where nullif(section.value ->> 'page_id', '') is not null
      and not ((section.value ->> 'page_id')::uuid = any(v_page_ids))
  ) then
    raise exception 'forbidden';
  end if;

  delete from public.public_site_sections
  where tenant_id = p_tenant_id
    and not (id = any(v_ids));

  v_index := 0;
  for v_section in select value from jsonb_array_elements(v_sections)
  loop
    insert into public.public_site_sections (
      id,
      tenant_id,
      page_id,
      section_type,
      sort_order,
      visible,
      payload
    )
    values (
      coalesce(nullif(v_section ->> 'id', '')::uuid, gen_random_uuid()),
      p_tenant_id,
      nullif(v_section ->> 'page_id', '')::uuid,
      v_section ->> 'section_type',
      coalesce((v_section ->> 'sort_order')::int, v_index * 10),
      coalesce((v_section ->> 'visible')::boolean, true),
      coalesce(v_section -> 'payload', '{}'::jsonb)
    )
    on conflict (id) do update set
      page_id = excluded.page_id,
      section_type = excluded.section_type,
      sort_order = excluded.sort_order,
      visible = excluded.visible,
      payload = excluded.payload,
      updated_at = now();
    v_index := v_index + 1;
  end loop;

  return v_version;
end;
$$;

revoke all on function public.upsert_public_site_settings_atomic(
  uuid, text, text, boolean, boolean, text, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, integer, jsonb, jsonb
) from public;

grant execute on function public.upsert_public_site_settings_atomic(
  uuid, text, text, boolean, boolean, text, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, integer, jsonb, jsonb
) to service_role;
