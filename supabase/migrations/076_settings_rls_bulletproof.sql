-- 076 — Align settings tables with bulletproof RLS (045 tenant_row_visible model)

do $$
declare
  tbl text;
  pol text;
  tables text[] := array[
    'public_site_settings',
    'public_site_sections',
    'guest_app_settings',
    'booking_guest_access'
  ];
begin
  foreach tbl in array tables loop
    execute format('drop policy if exists tenant_isolation on public.%I', tbl);
    execute format(
      'drop policy if exists tenant_isolation_%1$s on public.%1$I',
      tbl
    );
    pol := format('tenant_isolation_%s', tbl);
    execute format(
      $p$
      create policy %2$I on public.%1$I
        for all
        using (public.tenant_row_visible(tenant_id))
        with check (public.tenant_row_visible(tenant_id))
      $p$,
      tbl,
      pol
    );
  end loop;
end $$;
