-- =============================================================================
-- 063 — Guest app live features: pre-check-in + green stay requests
-- =============================================================================

create table if not exists public.guest_precheckin_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,

  guest_phone text,
  guest_email text,
  document_type text check (document_type is null or document_type in ('ci', 'pasaport', 'permis')),
  document_number text,
  notes text,

  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (booking_id)
);

create index if not exists guest_precheckin_submissions_tenant_idx
  on public.guest_precheckin_submissions (tenant_id);

alter table public.guest_precheckin_submissions enable row level security;

drop policy if exists tenant_isolation_guest_precheckin on public.guest_precheckin_submissions;
create policy tenant_isolation_guest_precheckin
  on public.guest_precheckin_submissions
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop trigger if exists guest_precheckin_submissions_updated_at on public.guest_precheckin_submissions;
create trigger guest_precheckin_submissions_updated_at
  before update on public.guest_precheckin_submissions
  for each row execute function public.set_updated_at();

create table if not exists public.guest_green_stay_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,

  skip_date date not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'acknowledged', 'cancelled')),

  created_at timestamptz not null default now(),

  unique (booking_id, skip_date)
);

create index if not exists guest_green_stay_requests_tenant_idx
  on public.guest_green_stay_requests (tenant_id, skip_date);

alter table public.guest_green_stay_requests enable row level security;

drop policy if exists tenant_isolation_guest_green_stay on public.guest_green_stay_requests;
create policy tenant_isolation_guest_green_stay
  on public.guest_green_stay_requests
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

comment on table public.guest_precheckin_submissions is
  'Date pre-check-in trimise de oaspete din guest app — recepția finalizează check-in-ul.';
comment on table public.guest_green_stay_requests is
  'Cereri omitere curățenie (green stay) per booking și dată.';
