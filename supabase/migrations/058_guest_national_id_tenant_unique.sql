-- CNP / cod personal unic per tenant (multi-tenant safe)

drop index if exists public.guests_national_id_uidx;

create unique index if not exists guests_tenant_national_id_uidx
  on public.guests (tenant_id, national_id_type, national_id)
  where national_id is not null and national_id <> '';
