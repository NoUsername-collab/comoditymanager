-- Istoric acțiuni admin (Stable v0.1.1+)

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  actor_id uuid,
  actor_email text,

  action text not null,
  entity_type text not null
    check (entity_type in (
      'booking', 'building', 'room', 'floor', 'settings', 'session', 'pension'
    )),
  entity_id text,

  summary text not null,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.admin_activity_log is
  'Jurnal acțiuni: confirmări, mutări Gantt, CRUD camere/clădiri, setări, login.';

create index if not exists admin_activity_log_created_at_idx
  on public.admin_activity_log (created_at desc);

create index if not exists admin_activity_log_entity_idx
  on public.admin_activity_log (entity_type, entity_id);

create index if not exists admin_activity_log_booking_idx
  on public.admin_activity_log (entity_id, created_at desc)
  where entity_type = 'booking';
