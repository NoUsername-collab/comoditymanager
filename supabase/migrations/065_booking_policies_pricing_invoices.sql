-- 065: Politici rezervare, prețuri weekend/sezon, facturi emise

alter table public.pension_settings
  add column if not exists cancellation_policy_type text not null default 'moderate'
    check (cancellation_policy_type in ('flexible', 'moderate', 'strict', 'custom')),
  add column if not exists cancellation_policy_days integer not null default 3
    check (cancellation_policy_days >= 0 and cancellation_policy_days <= 90),
  add column if not exists cancellation_policy_custom_text text,
  add column if not exists pricing_weekend_enabled boolean not null default false,
  add column if not exists pricing_weekend_mode text not null default 'fri_sat'
    check (pricing_weekend_mode in ('fri_sat', 'sat_only')),
  add column if not exists pricing_weekend_multiplier numeric(5, 2) not null default 1.00
    check (pricing_weekend_multiplier >= 1 and pricing_weekend_multiplier <= 5),
  add column if not exists pricing_seasons jsonb not null default '[]'::jsonb,
  add column if not exists invoice_series text not null default 'HSP',
  add column if not exists invoice_next_number integer not null default 1
    check (invoice_next_number >= 1),
  add column if not exists invoice_seller_reg_com text;

comment on column public.pension_settings.pricing_seasons is
  'Array JSON: { id, name, startMonth, startDay, endMonth, endDay, multiplier } — se repetă anual.';

create table if not exists public.booking_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  series text not null,
  invoice_number integer not null check (invoice_number >= 1),
  display_number text not null,
  issued_at timestamptz not null default now(),
  seller_name text not null,
  seller_cui text,
  seller_reg_com text,
  seller_address text,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  check_in date not null,
  check_out date not null,
  subtotal numeric(10, 2) not null,
  total numeric(10, 2) not null,
  lines jsonb not null default '[]'::jsonb,
  notes text,
  status text not null default 'issued'
    check (status in ('issued', 'void')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, series, invoice_number)
);

create unique index if not exists booking_invoices_one_issued_per_booking
  on public.booking_invoices (tenant_id, booking_id)
  where status = 'issued';

create index if not exists booking_invoices_booking_idx
  on public.booking_invoices (tenant_id, booking_id);

drop trigger if exists booking_invoices_updated_at on public.booking_invoices;
create trigger booking_invoices_updated_at
  before update on public.booking_invoices
  for each row execute function public.set_updated_at();

alter table public.booking_invoices enable row level security;

drop policy if exists booking_invoices_tenant on public.booking_invoices;
create policy booking_invoices_tenant on public.booking_invoices
  for all
  using (public.tenant_row_visible(tenant_id))
  with check (public.tenant_row_visible(tenant_id));

create or replace function public.issue_next_invoice_number(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_series text;
  v_num integer;
begin
  if not public.is_service_role() then
    raise exception 'issue_next_invoice_number.service_role_only';
  end if;

  update public.pension_settings
  set invoice_next_number = invoice_next_number + 1
  where tenant_id = p_tenant_id
  returning invoice_series, invoice_next_number - 1
  into v_series, v_num;

  if not found then
    raise exception 'issue_next_invoice_number.pension_settings_missing';
  end if;

  return jsonb_build_object(
    'series', v_series,
    'number', v_num,
    'display', v_series || '-' || lpad(v_num::text, 4, '0')
  );
end;
$$;

comment on function public.issue_next_invoice_number(uuid) is
  'Alocă atomic următorul număr de factură pentru tenant (service_role).';

revoke all on function public.issue_next_invoice_number(uuid) from public;
revoke all on function public.issue_next_invoice_number(uuid) from anon, authenticated;
