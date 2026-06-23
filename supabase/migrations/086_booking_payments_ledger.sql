-- 086: Ledger incasari per rezervare (P0)

create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  kind text not null default 'payment'
    check (kind in ('payment', 'refund')),
  method text not null default 'cash'
    check (method in ('cash', 'card', 'transfer', 'online', 'other')),
  payer_name text,
  payer_tax_id text,
  paid_at timestamptz not null default now(),
  recorded_by uuid,
  notes text,
  invoice_id uuid references public.booking_invoices(id) on delete set null,
  idempotency_key text,
  legacy_checkin_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists booking_payments_idempotency
  on public.booking_payments (tenant_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists booking_payments_booking_id
  on public.booking_payments (tenant_id, booking_id, paid_at desc);

drop trigger if exists booking_payments_updated_at on public.booking_payments;
create trigger booking_payments_updated_at
  before update on public.booking_payments
  for each row execute function public.set_updated_at();

alter table public.booking_payments enable row level security;

drop policy if exists booking_payments_tenant on public.booking_payments;
create policy booking_payments_tenant on public.booking_payments
  for all
  using (public.tenant_row_visible(tenant_id))
  with check (public.tenant_row_visible(tenant_id));
