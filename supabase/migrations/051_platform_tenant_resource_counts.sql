-- 051 — Hospira platform: O(1) round-trips for tenant resource counts (100+ tenants)

create or replace function public.platform_tenant_resource_counts()
returns table (
  tenant_id uuid,
  member_count bigint,
  room_count bigint,
  booking_count bigint,
  building_count bigint,
  has_settings boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id as tenant_id,
    coalesce(m.cnt, 0)::bigint as member_count,
    coalesce(r.cnt, 0)::bigint as room_count,
    coalesce(bk.cnt, 0)::bigint as booking_count,
    coalesce(b.cnt, 0)::bigint as building_count,
    (ps.id is not null) as has_settings
  from public.tenants t
  left join public.pension_settings ps on ps.tenant_id = t.id
  left join (
    select tm.tenant_id, count(*)::bigint as cnt
    from public.tenant_members tm
    where tm.is_active = true
    group by tm.tenant_id
  ) m on m.tenant_id = t.id
  left join (
    select rm.tenant_id, count(*)::bigint as cnt
    from public.rooms rm
    group by rm.tenant_id
  ) r on r.tenant_id = t.id
  left join (
    select bk.tenant_id, count(*)::bigint as cnt
    from public.bookings bk
    group by bk.tenant_id
  ) bk on bk.tenant_id = t.id
  left join (
    select bd.tenant_id, count(*)::bigint as cnt
    from public.buildings bd
    group by bd.tenant_id
  ) b on b.tenant_id = t.id;
$$;

comment on function public.platform_tenant_resource_counts is
  'Hospira platform panel: per-tenant resource counts in one query (service_role only).';

revoke all on function public.platform_tenant_resource_counts() from public;
grant execute on function public.platform_tenant_resource_counts() to service_role;
