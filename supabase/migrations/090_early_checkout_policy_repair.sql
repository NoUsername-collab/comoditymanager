-- 090 - Early checkout policy columns (idempotent repair for DBs that skipped 082).

alter table public.pension_settings
  add column if not exists early_checkout_allowed boolean not null default true,
  add column if not exists early_checkout_fee numeric default 0;

comment on column public.pension_settings.early_checkout_allowed is
  'Recepția poate înregistra plecare devreme (înainte de data/ora standard).';
comment on column public.pension_settings.early_checkout_fee is
  'Taxă orientativă plecare devreme (RON) — notă recepție, fără încasare automată.';
