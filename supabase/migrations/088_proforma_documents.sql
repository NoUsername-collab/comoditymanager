-- 088: Proforma documents (P3) - serie PF separata, conversie la factura fiscala

alter table public.pension_settings
  add column if not exists proforma_series text not null default 'PF',
  add column if not exists proforma_next_number integer not null default 1
    check (proforma_next_number >= 1);

comment on column public.pension_settings.proforma_series is
  'Seria pentru proforme (ex. PF) - separata de seria fiscala HSP.';

alter table public.booking_invoices
  drop constraint if exists booking_invoices_invoice_kind_check;

alter table public.booking_invoices
  add constraint booking_invoices_invoice_kind_check
    check (invoice_kind in ('advance', 'partial', 'final', 'credit_note', 'proforma'));

alter table public.booking_invoices
  add column if not exists converted_to_invoice_id uuid
    references public.booking_invoices (id) on delete set null,
  add column if not exists source_proforma_id uuid
    references public.booking_invoices (id) on delete set null;

comment on column public.booking_invoices.converted_to_invoice_id is
  'Pe proforma: factura fiscala rezultata dupa conversie (P3).';

comment on column public.booking_invoices.source_proforma_id is
  'Pe factura fiscala: proforma sursa (P3).';

create index if not exists booking_invoices_active_proforma_idx
  on public.booking_invoices (tenant_id, booking_id)
  where invoice_kind = 'proforma' and status = 'issued' and converted_to_invoice_id is null;

create or replace function public.issue_next_proforma_number(p_tenant_id uuid)
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
    raise exception 'issue_next_proforma_number.service_role_only';
  end if;

  update public.pension_settings
  set proforma_next_number = proforma_next_number + 1
  where tenant_id = p_tenant_id
  returning proforma_series, proforma_next_number - 1
  into v_series, v_num;

  if not found then
    raise exception 'issue_next_proforma_number.pension_settings_missing';
  end if;

  return jsonb_build_object(
    'series', v_series,
    'number', v_num,
    'display', v_series || '-' || lpad(v_num::text, 4, '0')
  );
end;
$$;

comment on function public.issue_next_proforma_number(uuid) is
  'Aloca atomic urmatorul numar de proforma pentru tenant (service_role).';

revoke all on function public.issue_next_proforma_number(uuid) from public;
revoke all on function public.issue_next_proforma_number(uuid) from anon, authenticated;
