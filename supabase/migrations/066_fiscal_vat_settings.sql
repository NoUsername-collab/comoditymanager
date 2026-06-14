-- 066: Setări fiscale / TVA per tenant + coloane factură

alter table public.pension_settings
  add column if not exists invoice_vat_enabled boolean not null default true,
  add column if not exists invoice_vat_rate numeric(5, 2)
    check (invoice_vat_rate is null or (invoice_vat_rate >= 0 and invoice_vat_rate <= 100)),
  add column if not exists invoice_prices_include_vat boolean not null default true;

comment on column public.pension_settings.invoice_vat_rate is
  'Cotă TVA % pentru cazare; null = implicit din profilul țării tenantului.';

alter table public.booking_invoices
  add column if not exists currency text not null default 'RON',
  add column if not exists vat_rate numeric(5, 2),
  add column if not exists vat_amount numeric(10, 2) not null default 0,
  add column if not exists subtotal_net numeric(10, 2);
