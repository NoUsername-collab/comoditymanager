-- 033 — Activity log undo support (moved from duplicate 030_activity_undo)

alter table public.admin_activity_log
  add column if not exists undoable boolean not null default false,
  add column if not exists undone_at timestamptz,
  add column if not exists undone_by uuid,
  add column if not exists reverts_log_id uuid references public.admin_activity_log (id) on delete set null;

create index if not exists admin_activity_log_undoable_idx
  on public.admin_activity_log (tenant_id, created_at desc)
  where undoable = true and undone_at is null;

comment on column public.admin_activity_log.undoable is
  'When true, staff can revert this action from istoric.';
comment on column public.admin_activity_log.undone_at is
  'Set when the action was reverted via undo.';
comment on column public.admin_activity_log.reverts_log_id is
  'When this row is an undo event, points to the original log entry.';

alter table public.admin_activity_log
  drop constraint if exists admin_activity_log_entity_type_check;

alter table public.admin_activity_log
  add constraint admin_activity_log_entity_type_check
  check (entity_type in (
    'booking', 'building', 'room', 'floor', 'settings', 'session', 'pension', 'guest', 'staff'
  ));
