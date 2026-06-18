-- 081 — Align guest_feedback RLS with tenant_row_visible (045/076 model)

drop policy if exists tenant_isolation on public.guest_feedback;

create policy tenant_isolation_guest_feedback on public.guest_feedback
  for all
  using (public.tenant_row_visible(tenant_id))
  with check (public.tenant_row_visible(tenant_id));
