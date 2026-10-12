-- 105 — Short messages from the guest app to reception, shown on the stay file.

create table if not exists public.guest_reception_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  message text not null check (char_length(message) between 2 and 400),
  status text not null default 'pending' check (status in ('pending', 'seen')),
  created_at timestamptz not null default now()
);

create index if not exists guest_reception_requests_booking_idx
  on public.guest_reception_requests (tenant_id, booking_id, created_at desc);

alter table public.guest_reception_requests enable row level security;

drop policy if exists tenant_isolation_guest_reception_requests on public.guest_reception_requests;
create policy tenant_isolation_guest_reception_requests
  on public.guest_reception_requests
  for all
  using (public.tenant_row_visible(tenant_id))
  with check (public.tenant_row_visible(tenant_id));

comment on table public.guest_reception_requests is
  'Mesaje scurte trimise de oaspete din guest app. Recepția le vede pe fișa sejurului.';
