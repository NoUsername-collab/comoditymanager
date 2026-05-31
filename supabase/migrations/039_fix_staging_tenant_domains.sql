-- 039 — Staging: remove wrong *.hospira.ro rows when *.test.hospira.ro already exists

-- Case A: both domains exist for same tenant → drop the prod-style row
delete from public.tenant_domains td_old
using public.tenants t,
  public.platform_settings ps,
  public.tenant_domains td_new
where ps.key = 'tenant_domain_suffix'
  and ps.value = 'test.hospira.ro'
  and td_old.tenant_id = t.id
  and td_new.tenant_id = t.id
  and td_old.domain = t.slug || '.hospira.ro'
  and td_new.domain = t.slug || '.test.hospira.ro';

-- Case B: only prod-style row exists → rename to test
update public.tenant_domains td
set domain = t.slug || '.test.hospira.ro'
from public.tenants t,
  public.platform_settings ps
where ps.key = 'tenant_domain_suffix'
  and ps.value = 'test.hospira.ro'
  and td.tenant_id = t.id
  and td.domain = t.slug || '.hospira.ro'
  and not exists (
    select 1
    from public.tenant_domains td2
    where td2.tenant_id = t.id
      and td2.domain = t.slug || '.test.hospira.ro'
  );
