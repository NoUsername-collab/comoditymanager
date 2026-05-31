-- 031 — Staff auth fixes: self-read membership + public tenant lookup RPCs

drop policy if exists staff_read_own_membership on public.tenant_members;
create policy staff_read_own_membership on public.tenant_members
  for select
  to authenticated
  using (user_id = auth.uid() and is_active = true);

comment on policy staff_read_own_membership on public.tenant_members is
  'Login/proxy: authenticated user reads own membership across tenants.';

grant execute on function public.resolve_tenant_by_slug(text) to anon, authenticated;
grant execute on function public.resolve_tenant_by_domain(text) to anon, authenticated;
