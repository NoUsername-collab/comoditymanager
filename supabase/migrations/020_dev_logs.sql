-- Dev Logs — error/warn/info logging for diagnostics

create table if not exists public.dev_logs (
  id uuid primary key default gen_random_uuid(),

  level text not null default 'error'
    check (level in ('error', 'warn', 'info', 'debug')),

  source text not null default 'server',
  message text not null,
  stack text,

  context jsonb not null default '{}',

  request_path text,
  request_method text,
  user_id uuid,
  user_email text,

  duration_ms integer,

  created_at timestamptz not null default now()
);

comment on table public.dev_logs is
  'Jurnal diagnostic: erori server-side, avertismente, performance flags. Retenție ~30 zile.';

create index if not exists dev_logs_created_at_idx
  on public.dev_logs (created_at desc);

create index if not exists dev_logs_level_idx
  on public.dev_logs (level, created_at desc);

create index if not exists dev_logs_source_idx
  on public.dev_logs (source, created_at desc);
