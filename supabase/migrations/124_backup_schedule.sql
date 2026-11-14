-- 124 — Daily backups that keep up with any number of properties.
--
-- The backup ran once a day over every property in one 60-second call, and
-- read each table in one request, which the API caps at 1,000 rows. It now
-- runs every hour on the properties whose last backup is oldest, as many as
-- fit in the call, reading every table page by page. This column says when a
-- property's last complete backup was written.

alter table public.tenants
  add column if not exists last_backup_at timestamptz;

comment on column public.tenants.last_backup_at is
  'When the property''s last complete backup was written to storage (backups/tenants/<slug>/).';

create index if not exists tenants_last_backup_at_idx
  on public.tenants (last_backup_at nulls first)
  where status in ('active', 'trial');
