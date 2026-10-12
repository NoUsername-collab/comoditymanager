-- Run in Supabase SQL Editor (production). Every row must say true before the
-- app's "migration missing" fallbacks can be removed. Read-only.
with expected(kind, object_name, migration) as (
  values
    ('column', 'pension_settings.contact_email', '079'),
    ('column', 'pension_settings.logo_url', '101'),
    ('column', 'pension_settings.fisa_property_address', '052'),
    ('column', 'pension_settings.checkin_doc_rule', '048'),
    ('column', 'pension_settings.checkin_min_payment_pct', '048'),
    ('column', 'pension_settings.checkin_cnp_rule', '052'),
    ('column', 'pension_settings.checkout_block_unpaid', '055'),
    ('column', 'pension_settings.statistics_visibility', '049'),
    ('column', 'pension_settings.cancellation_policy_type', '065'),
    ('column', 'pension_settings.invoice_vat_enabled', '065'),
    ('column', 'pension_settings.team_permissions', '083'),
    ('column', 'pension_settings.proforma_series', '088'),
    ('column', 'checkin_guests.national_id', '052'),
    ('column', 'checkin_guests.document_series', '052'),
    ('column', 'checkin_guests.room_label', '052'),
    ('table', 'checkin_guests', '048'),
    ('table', 'public_site_settings', '054'),
    ('table', 'public_site_sections', '054'),
    ('table', 'guest_app_settings', '056'),
    ('table', 'booking_guest_access', '056'),
    ('table', 'guest_precheckin_submissions', '063'),
    ('table', 'guest_green_stay_requests', '063'),
    ('table', 'guest_loyalty_refs', '102'),
    ('table', 'rate_limits', '103'),
    ('function', 'upsert_public_site_settings_atomic', '077'),
    ('function', 'rate_limit_hit', '103')
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
    else exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = e.object_name)
  end as present
from expected e
order by present, e.migration, e.object_name;
