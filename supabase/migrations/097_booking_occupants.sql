-- 097: Occupants registered on a booking before check-in (one guest per room).

create table if not exists public.booking_occupants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  guest_id uuid not null references public.guests(id) on delete restrict,
  is_representative boolean not null default false,
  created_at timestamptz not null default now(),
  unique (booking_id, room_id)
);

create index if not exists booking_occupants_booking_idx
  on public.booking_occupants (tenant_id, booking_id);

create unique index if not exists booking_occupants_one_rep
  on public.booking_occupants (booking_id)
  where is_representative;

alter table public.booking_occupants enable row level security;

drop policy if exists booking_occupants_tenant on public.booking_occupants;
create policy booking_occupants_tenant on public.booking_occupants
  for all
  using (public.tenant_row_visible(tenant_id))
  with check (public.tenant_row_visible(tenant_id));
