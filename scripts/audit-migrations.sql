-- ============================================================
-- Audit migrări CasaEmil / Hospira
-- Rulează în Supabase → SQL Editor (read-only, nu modifică nimic).
-- Fiecare rând = o migrare + marker verificat în schema public.
-- ============================================================

with checks as (
  select * from (values
    ('001', 'pension_core',            'table',              'pension_settings',                         ''),
    ('002', 'buildings_ac_mode',       'column',             'buildings',                                'ac_mode'),
    ('003', 'bookings',                'table',              'bookings',                                 ''),
    ('004', 'guest_name_parts',        'column',             'bookings',                                 'guest_first_name'),
    ('005', 'statistics_foundation',   'column',             'bookings',                                 'confirmed_at'),
    ('006', 'v015_pricing_realtime',   'column',             'buildings',                                'default_price_per_night'),
    ('007', 'admin_activity_log',      'table',              'admin_activity_log',                       ''),
    ('008', 'admin_palettes',          'column',             'pension_settings',                         'admin_palette_key'),
    ('009', 'timeline_occupancy',      'table',              'booking_room_segments',                    ''),
    ('010', 'guests',                  'table',              'guests',                                   ''),
    ('011', 'admin_themes_modular',    'constraint',         'pension_settings',                         'pension_settings_admin_palette_source_check'),
    ('012', 'admin_themes_repair',       'seed',               '',                                         'repair — safe re-run 011'),
    ('013', 'factory_reset',           'function',           'admin_factory_reset',                      ''),
    ('014', 'country_themes',          'constraint',         'pension_settings',                         'pension_settings_admin_palette_key_check'),
    ('015', 'room_catalog',            'table',              'room_type_definitions',                    ''),
    ('016', 'guest_profiles',          'table',              'guest_profiles',                           ''),
    ('017', 'guest_profiles_stars',      'seed',               '',                                         'default stars_avg=1 — verifică guest_profiles'),
    ('018', 'guest_manual_traits',     'column',             'guest_profiles',                           'manual_positive_traits'),
    ('019', 'booking_checkin_out',     'column',             'bookings',                                 'actual_check_in_at'),
    ('020', 'dev_logs',                'table',              'dev_logs',                                 ''),
    ('021', 'guest_identity',          'column',             'guests',                                   'identity_status'),
    ('022', 'national_id',             'column',             'guests',                                   'national_id_type'),
    ('023', 'simulation',              'function',           'sim_start',                                ''),
    ('024', 'simulation_schema',       'function',           'sim_advance',                              ''),
    ('025', 'atomic_confirm',          'function',           'confirm_booking_with_rooms',               ''),
    ('026', 'multi_tenant',            'table',              'tenants',                                  ''),
    ('027', 'booking_conflict_guard',  'function',           'check_segment_conflict_before_insert',     ''),
    ('028', 'hospira_domains',         'function',           'onboard_new_tenant',                       ''),
    ('029', 'tenant_auth',             'function',           'get_tenant_member_role',                   ''),
    ('030', 'pricing_redesign',        'constraint',         'tenants',                                  'tenants_plan_id_check'),
    ('031', 'tenant_members_self',     'policy',             'tenant_members',                           'staff_read_own_membership'),
    ('032', 'skipped',                 'seed',               '',                                         'nu există fișier 032 în repo'),
    ('033', 'activity_undo',           'column',             'admin_activity_log',                       'undoable'),
    ('034', 'catalog_slug_tenant',     'index',              'room_type_definitions_tenant_slug_key',    ''),
    ('035', 'tenant_platform_domain',  'function',           'onboard_new_tenant',                       ''),
    ('036', 'platform_settings',       'table',              'platform_settings',                        ''),
    ('037', 'tenant_domain_routing',   'column',             'tenant_domains',                           'routing_kind'),
    ('038', 'platform_login_slug',     'function',           'get_my_primary_tenant_slug',               ''),
    ('039', 'fix_staging_domains',       'seed',               '',                                         'manual — verifică tenant_domains'),
    ('040', 'confirm_tenant_id',       'function',           'confirm_booking_with_rooms',               ''),
    ('041', 'security_hardening',      'function',           'sync_auth_user_tenant_memberships',        ''),
    ('042', 'factory_reset_tenant',    'function',           'admin_factory_reset_for_tenant',           ''),
    ('043', 'definer_search_path',     'function',           'confirm_booking_with_rooms',               ''),
    ('044', 'reconfirm_cancelled',     'function',           'confirm_booking_with_rooms',               ''),
    ('045', 'tenant_rls_bulletproof',  'function',           'tenant_row_visible',                       ''),
    ('046', 'rpc_tenant_guards',       'function',           'bind_auth_tenant_for_host',                ''),
    ('047', 'tenant_billing_flag',     'column',             'tenants',                                  'is_paying'),
    ('048', 'checkin_system',          'table',              'checkins',                                 ''),
    ('049', 'statistics_visibility',   'column',             'pension_settings',                         'statistics_visibility'),
    ('050', 'rooms_room_type_slug',    'constraint_dropped', 'rooms',                                    'rooms_room_type_check'),
    ('051', 'platform_resource_counts',  'function',           'platform_tenant_resource_counts',          '')
  ) as t(migration_id, slug, kind, obj1, obj2)
),
table_exists as (
  select table_name
  from information_schema.tables
  where table_schema = 'public'
),
column_exists as (
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public'
),
function_exists as (
  select p.proname as function_name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
policy_exists as (
  select tablename, policyname
  from pg_policies
  where schemaname = 'public'
),
constraint_exists as (
  select
    rel.relname as table_name,
    con.conname as constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
),
index_exists as (
  select indexname
  from pg_indexes
  where schemaname = 'public'
)
select
  c.migration_id,
  c.slug,
  c.kind,
  c.obj1 as object,
  coalesce(c.obj2, '') as detail,
  case
    when c.kind = 'seed' then 'MANUAL'
    when c.kind = 'table' and te.table_name is not null then 'OK'
    when c.kind = 'column' and ce.column_name is not null then 'OK'
    when c.kind = 'function' and fe.function_name is not null then 'OK'
    when c.kind = 'policy' and pe.policyname is not null then 'OK'
    when c.kind = 'constraint' and ce2.constraint_name is not null then 'OK'
    when c.kind = 'index' and ie.indexname is not null then 'OK'
    when c.kind = 'constraint_dropped' and ce2.constraint_name is null then 'OK'
    when c.kind = 'constraint_dropped' and ce2.constraint_name is not null then 'MISSING'
    else 'MISSING'
  end as status
from checks c
left join table_exists te on c.kind = 'table' and te.table_name = c.obj1
left join column_exists ce on c.kind = 'column' and ce.table_name = c.obj1 and ce.column_name = c.obj2
left join function_exists fe on c.kind = 'function' and fe.function_name = c.obj1
left join policy_exists pe on c.kind = 'policy' and pe.tablename = c.obj1 and pe.policyname = c.obj2
left join constraint_exists ce2
  on c.kind in ('constraint', 'constraint_dropped')
 and ce2.table_name = c.obj1
 and ce2.constraint_name = c.obj2
left join index_exists ie on c.kind = 'index' and ie.indexname = c.obj1
order by c.migration_id;

-- Rezumat rapid: doar ce lipsește
-- select * from (<query de mai sus>) q where status = 'MISSING';
