-- 100 — Public site chrome (logo, nav, fonts) + legal/SEO pages JSON

alter table public.public_site_settings
  add column if not exists chrome jsonb not null default '{}'::jsonb;

alter table public.public_site_settings
  add column if not exists pages jsonb not null default '{}'::jsonb;

comment on column public.public_site_settings.chrome is
  'Operator chrome: logo, header/footer copy, nav labels, font, contact-bar visibility.';

comment on column public.public_site_settings.pages is
  'Operator page copy: coming soon, terms, privacy, extra SEO, OG image.';

drop function if exists public.upsert_public_site_settings_atomic(
  uuid, text, text, boolean, boolean, text, boolean, jsonb, jsonb, jsonb, jsonb, jsonb
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
  p_sections jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_section jsonb;
  v_index int := 0;
begin
  if not public.is_service_role() then
    raise exception 'forbidden';
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
    pages
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
    coalesce(p_pages, '{}'::jsonb)
  )
  on conflict (tenant_id) do update set
    template_id = excluded.template_id,
    theme_id = excluded.theme_id,
    published = excluded.published,
    booking_enabled = excluded.booking_enabled,
    booking_nav_position = excluded.booking_nav_position,
    use_primary_contact = excluded.use_primary_contact,
    hero = excluded.hero,
    contact = excluded.contact,
    seo = excluded.seo,
    booking_notice = excluded.booking_notice,
    chrome = excluded.chrome,
    pages = excluded.pages,
    updated_at = now();

  delete from public.public_site_sections
  where tenant_id = p_tenant_id;

  if p_sections is null or jsonb_array_length(p_sections) = 0 then
    return;
  end if;

  for v_section in select value from jsonb_array_elements(p_sections)
  loop
    insert into public.public_site_sections (
      tenant_id,
      section_type,
      sort_order,
      visible,
      payload
    )
    values (
      p_tenant_id,
      v_section ->> 'section_type',
      coalesce((v_section ->> 'sort_order')::int, v_index * 10),
      coalesce((v_section ->> 'visible')::boolean, true),
      coalesce(v_section -> 'payload', '{}'::jsonb)
    );
    v_index := v_index + 1;
  end loop;
end;
$$;

revoke all on function public.upsert_public_site_settings_atomic(
  uuid, text, text, boolean, boolean, text, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) from public;

grant execute on function public.upsert_public_site_settings_atomic(
  uuid, text, text, boolean, boolean, text, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) to service_role;
