-- 101 — One property logo, owned by pension identity.

alter table public.pension_settings
  add column if not exists logo_url text;

comment on column public.pension_settings.logo_url is
  'Logo shown on the public site and guest app. The owner uploads any JPEG, PNG, or WebP.';

update public.pension_settings ps
set logo_url = nullif(btrim(pss.chrome->>'logoUrl'), '')
from public.public_site_settings pss
where pss.tenant_id = ps.tenant_id
  and (ps.logo_url is null or btrim(ps.logo_url) = '')
  and nullif(btrim(pss.chrome->>'logoUrl'), '') is not null;

update public.pension_settings ps
set logo_url = nullif(btrim(gas.appearance->>'logoUrl'), '')
from public.guest_app_settings gas
where gas.tenant_id = ps.tenant_id
  and (ps.logo_url is null or btrim(ps.logo_url) = '')
  and nullif(btrim(gas.appearance->>'logoUrl'), '') is not null;
