-- Run in Supabase SQL Editor (production). Read-only.
-- Lists the schema the app's remaining "migration missing" fallbacks wait for
-- (public site, payments, invoices, proformas, ANAF). Every row must say true
-- before those fallbacks can be removed.
-- The first batch (identity, settings, check-in, guest app, migrations 048–103)
-- was confirmed on 2026-10-12 and its fallbacks are already gone.
with expected(kind, object_name, migration) as (
  values
    ('column', 'public_site_settings.booking_notice', '098'),
    ('column', 'public_site_settings.chrome', '100'),
    ('column', 'public_site_settings.pages', '100'),
    -- 100 replaces the save function with a 14-argument version (chrome, pages).
    ('function14', 'upsert_public_site_settings_atomic', '100'),
    ('table', 'booking_invoices', '065'),
    ('column', 'booking_invoices.invoice_kind', '088'),
    ('table', 'booking_payments', '086'),
    ('table', 'fiscal_submission_jobs', '089'),
    ('table', 'tenant_fiscal_settings', '089')
)
select
  e.kind,
  e.object_name,
  e.migration,
  case e.kind
    when 'column' then exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = split_part(e.object_name, '.', 1)
        and c.column_name = split_part(e.object_name, '.', 2))
    when 'table' then exists (
      select 1 from information_schema.tables t
      where t.table_schema = 'public' and t.table_name = e.object_name)
    when 'function14' then exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = e.object_name and p.pronargs = 14)
    else exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = e.object_name)
  end as present
from expected e
order by present, e.migration, e.object_name;
