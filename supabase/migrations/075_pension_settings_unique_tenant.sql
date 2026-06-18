-- 075 — One pension_settings row per tenant (dedupe + unique constraint)

-- Keep the most recently updated row per tenant; ties broken by id.
with ranked as (
  select
    id,
    row_number() over (
      partition by tenant_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.pension_settings
)
delete from public.pension_settings ps
using ranked r
where ps.id = r.id
  and r.rn > 1;

drop index if exists pension_settings_tenant_id_idx;

create unique index pension_settings_tenant_id_unique_idx
  on public.pension_settings (tenant_id);

comment on index public.pension_settings_tenant_id_unique_idx is
  'Exactly one pension_settings row per tenant.';
