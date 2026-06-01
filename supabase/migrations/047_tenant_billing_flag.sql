-- Billing flag: distinguishes paying tenants from free/gifted ones.
-- MRR calculation only counts tenants where is_paying = true.

alter table public.tenants
  add column if not exists is_paying boolean not null default false;

comment on column public.tenants.is_paying is
  'True if tenant pays for their plan. False = free tier or gifted plan. MRR only counts paying tenants.';
