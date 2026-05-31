-- 041 — RLS gaps, lock down dangerous RPCs, safer owner relink

-- ── 1. Catalog junction tables (were missing RLS) ───────────────────────────

alter table public.room_type_default_options enable row level security;
drop policy if exists tenant_isolation on public.room_type_default_options;
create policy tenant_isolation on public.room_type_default_options
  for all
  using (
    exists (
      select 1
      from public.room_type_definitions rtd
      where rtd.id = room_type_id
        and rtd.tenant_id = public.auth_tenant_id()
    )
    or public.is_service_role()
  )
  with check (
    exists (
      select 1
      from public.room_type_definitions rtd
      where rtd.id = room_type_id
        and rtd.tenant_id = public.auth_tenant_id()
    )
    or public.is_service_role()
  );

alter table public.building_option_policies enable row level security;
drop policy if exists tenant_isolation on public.building_option_policies;
create policy tenant_isolation on public.building_option_policies
  for all
  using (
    exists (
      select 1
      from public.buildings b
      where b.id = building_id
        and b.tenant_id = public.auth_tenant_id()
    )
    or public.is_service_role()
  )
  with check (
    exists (
      select 1
      from public.buildings b
      where b.id = building_id
        and b.tenant_id = public.auth_tenant_id()
    )
    or public.is_service_role()
  );

alter table public.room_enabled_options enable row level security;
drop policy if exists tenant_isolation on public.room_enabled_options;
create policy tenant_isolation on public.room_enabled_options
  for all
  using (
    exists (
      select 1
      from public.rooms r
      where r.id = room_id
        and r.tenant_id = public.auth_tenant_id()
    )
    or public.is_service_role()
  )
  with check (
    exists (
      select 1
      from public.rooms r
      where r.id = room_id
        and r.tenant_id = public.auth_tenant_id()
    )
    or public.is_service_role()
  );

-- ── 2. Platform settings (global config) ───────────────────────────────────

alter table public.platform_settings enable row level security;
revoke all on table public.platform_settings from anon, authenticated;

-- No policies for anon/authenticated → deny direct API access (service role bypasses RLS).

-- ── 3. Safer login relink: staff only; owner via signup/onboard only ─────────

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
    and tm.role in ('admin', 'operator')
    and tm.user_id is distinct from v_uid;

  update public.tenant_members tm
  set
    user_id = v_uid,
    updated_at = now()
  where lower(trim(tm.email)) = v_email
    and tm.is_active = true
    and tm.role = 'owner'
    and tm.user_id is distinct from v_uid
    and not exists (
      select 1
      from auth.users u2
      where u2.id = tm.user_id
    );
end;
$$;

-- ── 4. REVOKE dangerous RPCs from anon / authenticated ───────────────────────
--     App uses service_role for these. Public routing RPCs stay granted in 031.

revoke all on function public.confirm_booking_with_rooms(uuid, uuid[], numeric)
  from public, anon, authenticated;

revoke all on function public.onboard_new_tenant(
  text, text, uuid, text, text, text, text, text
) from public, anon, authenticated;

revoke all on function public.update_tenant_plan(uuid, text, text, text)
  from public, anon, authenticated;

-- add_tenant_domain: 2-arg (026) and/or 3-arg (037) — skip if not installed yet
do $$
begin
  revoke all on function public.add_tenant_domain(uuid, text)
    from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke all on function public.add_tenant_domain(uuid, text, text)
    from public, anon, authenticated;
exception when undefined_function then null;
end $$;

revoke all on function public.sim_start()
  from public, anon, authenticated;

revoke all on function public.sim_stop()
  from public, anon, authenticated;

revoke all on function public.sim_is_active()
  from public, anon, authenticated;

revoke all on function public.sim_force_cleanup()
  from public, anon, authenticated;

revoke all on function public.sim_advance(date)
  from public, anon, authenticated;

-- Legacy simulation RPCs (023) if still present
do $$
begin
  revoke all on function public.sim_backup_start() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke all on function public.sim_backup_restore() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

grant execute on function public.confirm_booking_with_rooms(uuid, uuid[], numeric)
  to service_role;

grant execute on function public.onboard_new_tenant(
  text, text, uuid, text, text, text, text, text
) to service_role;

grant execute on function public.update_tenant_plan(uuid, text, text, text)
  to service_role;

do $$
begin
  grant execute on function public.add_tenant_domain(uuid, text) to service_role;
exception when undefined_function then null;
end $$;

do $$
begin
  grant execute on function public.add_tenant_domain(uuid, text, text) to service_role;
exception when undefined_function then null;
end $$;

grant execute on function public.sim_start() to service_role;
grant execute on function public.sim_stop() to service_role;
grant execute on function public.sim_is_active() to service_role;
grant execute on function public.sim_force_cleanup() to service_role;
grant execute on function public.sim_advance(date) to service_role;
