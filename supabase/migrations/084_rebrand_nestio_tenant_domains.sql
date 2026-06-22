-- 084 — Hospira → Nestio: tenant subdomains + platform_settings suffix

update public.platform_settings
set value = 'nestio.ro'
where key = 'tenant_domain_suffix'
  and value in ('hospira.ro', 'rezova.ro');

update public.platform_settings
set value = 'test.nestio.ro'
where key = 'tenant_domain_suffix'
  and value in ('test.hospira.ro', 'test.rezova.ro');

-- Rename *.hospira.ro subdomain rows when *.nestio.ro does not exist yet
update public.tenant_domains td
set domain = t.slug || '.nestio.ro'
from public.tenants t
where td.tenant_id = t.id
  and td.domain = t.slug || '.hospira.ro'
  and not exists (
    select 1
    from public.tenant_domains td2
    where td2.tenant_id = t.id
      and td2.domain = t.slug || '.nestio.ro'
  );

-- Staging: rename *.test.hospira.ro → *.test.nestio.ro when missing
update public.tenant_domains td
set domain = t.slug || '.test.nestio.ro'
from public.tenants t
where td.tenant_id = t.id
  and td.domain = t.slug || '.test.hospira.ro'
  and not exists (
    select 1
    from public.tenant_domains td2
    where td2.tenant_id = t.id
      and td2.domain = t.slug || '.test.nestio.ro'
  );

-- Ensure every active/trial tenant has a Nestio subdomain row
insert into public.tenant_domains (tenant_id, domain, routing_kind, verified, verified_at, ssl_active)
select
  t.id,
  t.slug || '.nestio.ro',
  'hospira_subdomain',
  true,
  now(),
  true
from public.tenants t
where t.status in ('active', 'trial')
  and not exists (
    select 1
    from public.tenant_domains td
    where td.tenant_id = t.id
      and td.domain = t.slug || '.nestio.ro'
  );
