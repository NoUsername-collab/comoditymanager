-- 087: Multi-factura per rezervare (P2)

drop index if exists public.booking_invoices_one_issued_per_booking;

alter table public.booking_invoices
  add column if not exists invoice_kind text not null default 'final'
    check (invoice_kind in ('advance', 'partial', 'final', 'credit_note')),
  add column if not exists invoice_sequence integer not null default 1
    check (invoice_sequence >= 1);

comment on column public.booking_invoices.invoice_kind is
  'Tip document: advance, partial, final, credit_note (P2 multi-factura).';

comment on column public.booking_invoices.invoice_sequence is
  'Ordinea emiterii pe rezervare (1, 2, 3...).';

create index if not exists booking_invoices_booking_sequence_idx
  on public.booking_invoices (tenant_id, booking_id, invoice_sequence);