-- 029 — Tenant-scoped staff auth (tenant_members lookup + Casa Emil backfill)

create or replace function public.get_tenant_member_role(
  p_tenant_id uuid,
  p_user_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.tenant_members tm
  where tm.tenant_id = p_tenant_id
    and tm.user_id = p_user_id
    and tm.is_active = true
  limit 1;
$$;

comment on function public.get_tenant_member_role is
  'Active tenant_members role for auth checks (proxy + login).';

grant execute on function public.get_tenant_member_role(uuid, uuid) to service_role;

-- Backfill Casa Emil staff from Supabase Auth (admin/operator env accounts + app_metadata)
insert into public.tenant_members (
  tenant_id, user_id, email, role, is_active, invited_at, accepted_at
)
select
  t.id,
  u.id,
  lower(u.email),
  case
    when lower(coalesce(u.raw_app_meta_data->>'role', '')) = 'operator' then 'operator'
    when lower(coalesce(u.raw_app_meta_data->>'role', '')) = 'owner' then 'owner'
    when lower(u.email) like '%operator%' then 'operator'
    else 'admin'
  end,
  true,
  now(),
  now()
from public.tenants t
cross join auth.users u
where t.slug = 'casa-emil'
  and u.email is not null
  and (
    lower(coalesce(u.raw_app_meta_data->>'role', '')) in ('admin', 'operator', 'owner')
    or lower(u.email) in ('admin@casaemil.ro', 'operator@casaemil.ro')
  )
  and not exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = t.id and tm.user_id = u.id
  );
