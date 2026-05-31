-- 038 — Platform login: relink Auth ↔ tenant (all users), resolve slug (RLS-safe)
--
-- Run once per Supabase project (staging + production). No per-email SQL.

-- ── 1. One-time repair: every email where Auth user exists but IDs diverged ──
update public.tenant_members tm
set
  user_id = u.id,
  updated_at = now()
from auth.users u
where lower(trim(tm.email)) = lower(trim(u.email))
  and tm.is_active = true
  and tm.user_id is distinct from u.id;

update public.tenants t
set
  owner_id = u.id,
  updated_at = now()
from auth.users u
where lower(trim(t.owner_email)) = lower(trim(u.email))
  and t.owner_id is distinct from u.id;

-- ── 2. Per-session sync (called on every platform login) ─────────────────────
create or replace function public.sync_auth_user_tenant_memberships()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return;
  end if;

  select lower(trim(u.email))
  into v_email
  from auth.users u
  where u.id = v_uid;

  if v_email is null or v_email = '' then
    return;
  end if;

  update public.tenant_members tm
  set
    user_id = v_uid,
    updated_at = now()
  where lower(trim(tm.email)) = v_email
    and tm.is_active = true
    and tm.user_id is distinct from v_uid;

  update public.tenants t
  set
    owner_id = v_uid,
    updated_at = now()
  where lower(trim(t.owner_email)) = v_email
    and t.owner_id is distinct from v_uid;
end;
$$;

comment on function public.sync_auth_user_tenant_memberships is
  'Align tenant_members.user_id and tenants.owner_id with the logged-in auth.users row (same email).';

grant execute on function public.sync_auth_user_tenant_memberships() to authenticated;

-- ── 3. Primary tenant slug (security definer — no broken tenants RLS join) ──
create or replace function public.get_my_primary_tenant_slug()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select t.slug
  from public.tenant_members tm
  inner join public.tenants t on t.id = tm.tenant_id
  where tm.user_id = auth.uid()
    and tm.is_active = true
    and t.status in ('active', 'trial')
  order by
    case tm.role
      when 'owner' then 0
      when 'admin' then 1
      when 'operator' then 2
      else 9
    end,
    tm.created_at asc
  limit 1;
$$;

comment on function public.get_my_primary_tenant_slug is
  'First active tenant slug for auth.uid() (platform login redirect).';

grant execute on function public.get_my_primary_tenant_slug() to authenticated;

-- ── 4. Single entry point for app (sync + slug, one round-trip) ─────────────
create or replace function public.prepare_platform_session()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_auth_user_tenant_memberships();
  return public.get_my_primary_tenant_slug();
end;
$$;

comment on function public.prepare_platform_session is
  'Platform login/proxy: relink memberships then return primary tenant slug.';

grant execute on function public.prepare_platform_session() to authenticated;

-- ── 5. Signup guard: distinguish “log in” vs stale DB row ───────────────────
create or replace function public.check_owner_email_for_signup(p_email text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select lower(trim(p_email)) as email
  ),
  owner_row as (
    select 1
    from public.tenant_members tm, normalized n
    where lower(trim(tm.email)) = n.email
      and tm.role = 'owner'
      and tm.is_active = true
    limit 1
  ),
  auth_row as (
    select 1
    from auth.users u, normalized n
    where lower(trim(u.email)) = n.email
    limit 1
  )
  select case
    when not exists (select 1 from owner_row) then 'available'
    when exists (select 1 from auth_row) then 'login_required'
    else 'stale_owner_row'
  end;
$$;

comment on function public.check_owner_email_for_signup is
  'Signup: available | login_required (Auth+tenant) | stale_owner_row (tenant without Auth).';

grant execute on function public.check_owner_email_for_signup(text) to service_role;
