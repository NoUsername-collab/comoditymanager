-- 110 — Public site: remember which texts were copied from another language.
-- The editor marks text it fills in from another language as not translated yet,
-- so the language progress does not count it. Until now that list lived only in
-- the browser and was lost on reload; it is now saved with the site.

alter table public.public_site_settings
  add column if not exists untranslated_copy jsonb not null default '{}'::jsonb;

comment on column public.public_site_settings.untranslated_copy is
  'Per language, texts copied from another language and not translated yet (editor only).';

drop function if exists public.upsert_public_site_settings_atomic(
  uuid, text, text, boolean, boolean, text, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, integer
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
  p_untranslated_copy jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sections jsonb := coalesce(p_sections, '[]'::jsonb);
  v_section jsonb;
  v_index int := 0;
  v_current int;
  v_version int;
  v_ids uuid[];
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

  delete from public.public_site_sections
  where tenant_id = p_tenant_id
    and not (id = any(v_ids));

  for v_section in select value from jsonb_array_elements(v_sections)
  loop
    insert into public.public_site_sections (
      id,
      tenant_id,
      section_type,
      sort_order,
      visible,
      payload
    )
    values (
      coalesce(nullif(v_section ->> 'id', '')::uuid, gen_random_uuid()),
      p_tenant_id,
      v_section ->> 'section_type',
      coalesce((v_section ->> 'sort_order')::int, v_index * 10),
      coalesce((v_section ->> 'visible')::boolean, true),
      coalesce(v_section -> 'payload', '{}'::jsonb)
    )
    on conflict (id) do update set
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
  uuid, text, text, boolean, boolean, text, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, integer, jsonb
) from public;

grant execute on function public.upsert_public_site_settings_atomic(
  uuid, text, text, boolean, boolean, text, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, integer, jsonb
) to service_role;
