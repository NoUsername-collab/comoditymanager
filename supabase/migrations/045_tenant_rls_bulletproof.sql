-- 045 — RLS bulletproof: JWT tenant claim + membership + WITH CHECK

-- ── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.auth_tenant_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select nullif(
    trim(
      coalesce(
        current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id',
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id'
      )
    ),
    ''
  )::uuid;
$$;

comment on function public.auth_tenant_id is
  'Active tenant from JWT (root claim or app_metadata.tenant_id). Set by app per host.';

create or replace function public.auth_user_is_active_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  );
$$;

comment on function public.auth_user_is_active_member(uuid) is
  'True when auth.uid() is an active member of the tenant.';

grant execute on function public.auth_user_is_active_member(uuid) to authenticated;

create or replace function public.tenant_row_visible(p_tenant_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    public.is_service_role()
    or (
      auth.uid() is not null
      and public.auth_tenant_id() is not null
      and p_tenant_id = public.auth_tenant_id()
      and public.auth_user_is_active_member(p_tenant_id)
    );
$$;

comment on function public.tenant_row_visible(uuid) is
  'RLS: service_role bypasses policies; authenticated needs matching JWT tenant + membership.';

-- ── Direct tenant_id tables ─────────────────────────────────────────────────

do $$
declare
  tbl text;
  tables text[] := array[
    'pension_settings',
    'buildings',
    'floors',
    'rooms',
    'bookings',
    'booking_rooms',
    'booking_room_segments',
    'room_holds',
    'room_blocks',
    'guests',
    'guest_profiles',
    'guest_stay_reviews',
    'room_option_definitions',
    'room_type_definitions',
    'admin_activity_log',
    'dev_logs',
    'tenant_domains',
    'tenant_members'
  ];
begin
  foreach tbl in array tables loop
    execute format(
      'drop policy if exists tenant_isolation on public.%I',
      tbl
    );
    execute format(
      $p$
      create policy tenant_isolation on public.%1$I
        for all
        using (public.tenant_row_visible(tenant_id))
        with check (public.tenant_row_visible(tenant_id))
      $p$,
      tbl
    );
  end loop;
end $$;

drop policy if exists tenant_isolation on public.tenants;
create policy tenant_isolation on public.tenants
  for all
  using (public.tenant_row_visible(id))
  with check (public.tenant_row_visible(id));

-- Keep staff self-read for login (all memberships)
drop policy if exists staff_read_own_membership on public.tenant_members;
create policy staff_read_own_membership on public.tenant_members
  for select
  to authenticated
  using (user_id = auth.uid() and is_active = true);

-- ── Catalog junction tables (041) — same visibility via parent tenant ───────

drop policy if exists tenant_isolation on public.room_type_default_options;
create policy tenant_isolation on public.room_type_default_options
  for all
  using (
    exists (
      select 1
      from public.room_type_definitions rtd
      where rtd.id = room_type_id
        and public.tenant_row_visible(rtd.tenant_id)
    )
    or public.is_service_role()
  )
  with check (
    exists (
      select 1
      from public.room_type_definitions rtd
      where rtd.id = room_type_id
        and public.tenant_row_visible(rtd.tenant_id)
    )
    or public.is_service_role()
  );

drop policy if exists tenant_isolation on public.building_option_policies;
create policy tenant_isolation on public.building_option_policies
  for all
  using (
    exists (
      select 1
      from public.buildings b
      where b.id = building_id
        and public.tenant_row_visible(b.tenant_id)
    )
    or public.is_service_role()
  )
  with check (
    exists (
      select 1
      from public.buildings b
      where b.id = building_id
        and public.tenant_row_visible(b.tenant_id)
    )
    or public.is_service_role()
  );

drop policy if exists tenant_isolation on public.room_enabled_options;
create policy tenant_isolation on public.room_enabled_options
  for all
  using (
    exists (
      select 1
      from public.rooms r
      where r.id = room_id
        and public.tenant_row_visible(r.tenant_id)
    )
    or public.is_service_role()
  )
  with check (
    exists (
      select 1
      from public.rooms r
      where r.id = room_id
        and public.tenant_row_visible(r.tenant_id)
    )
    or public.is_service_role()
  );

-- Prevent moving rows across tenants
create or replace function public.reject_tenant_id_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.tenant_id is distinct from old.tenant_id then
    raise exception 'tenant.cannot_reassign_row';
  end if;
  return new;
end;
$$;

do $$
declare
  tbl text;
  tables text[] := array[
    'pension_settings', 'buildings', 'floors', 'rooms', 'bookings',
    'booking_rooms', 'booking_room_segments', 'room_holds', 'room_blocks',
    'guests', 'guest_profiles', 'guest_stay_reviews',
    'room_option_definitions', 'room_type_definitions',
    'admin_activity_log', 'dev_logs', 'tenant_domains'
  ];
begin
  foreach tbl in array tables loop
    execute format('drop trigger if exists trg_reject_tenant_id_change on public.%I', tbl);
    execute format(
      'create trigger trg_reject_tenant_id_change before update on public.%I for each row execute function public.reject_tenant_id_change()',
      tbl
    );
  end loop;
end $$;
