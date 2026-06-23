-- 089: e-Factura / ANAF fiscal submission jobs (P4)

create table if not exists public.tenant_fiscal_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  provider text not null default 'internal_pdf'
    check (provider in ('internal_pdf', 'anaf')),
  anaf_enabled boolean not null default false,
  anaf_cif text,
  anaf_env text not null default 'test'
    check (anaf_env in ('test', 'prod')),
  anaf_credentials jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.tenant_fiscal_settings is
  'Per-tenant fiscal provider (PDF local vs ANAF e-Factura).';

create table if not exists public.fiscal_submission_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_invoice_id uuid not null references public.booking_invoices(id) on delete cascade,
  idempotency_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'accepted', 'rejected', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  last_error text,
  anaf_upload_id text,
  submitted_at timestamptz,
  resolved_at timestamptz,
  payload_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists fiscal_submission_jobs_idempotency
  on public.fiscal_submission_jobs (tenant_id, idempotency_key);

create index if not exists fiscal_submission_jobs_invoice
  on public.fiscal_submission_jobs (tenant_id, booking_invoice_id);

create index if not exists fiscal_submission_jobs_pending
  on public.fiscal_submission_jobs (status, created_at)
  where status in ('pending', 'submitted', 'failed');

comment on table public.fiscal_submission_jobs is
  'Async ANAF e-Factura submission queue; one active job per invoice.';

alter table public.booking_invoices
  add column if not exists fiscal_status text
    check (
      fiscal_status is null
      or fiscal_status in ('pending', 'submitted', 'accepted', 'rejected', 'failed')
    );

comment on column public.booking_invoices.fiscal_status is
  'Denormalized latest ANAF submission status for UI (null = not applicable).';

drop trigger if exists tenant_fiscal_settings_updated_at on public.tenant_fiscal_settings;
create trigger tenant_fiscal_settings_updated_at
  before update on public.tenant_fiscal_settings
  for each row execute function public.set_updated_at();

drop trigger if exists fiscal_submission_jobs_updated_at on public.fiscal_submission_jobs;
create trigger fiscal_submission_jobs_updated_at
  before update on public.fiscal_submission_jobs
  for each row execute function public.set_updated_at();

alter table public.tenant_fiscal_settings enable row level security;
alter table public.fiscal_submission_jobs enable row level security;

drop policy if exists tenant_fiscal_settings_tenant on public.tenant_fiscal_settings;
create policy tenant_fiscal_settings_tenant on public.tenant_fiscal_settings
  for all
  using (public.tenant_row_visible(tenant_id))
  with check (public.tenant_row_visible(tenant_id));

drop policy if exists fiscal_submission_jobs_tenant on public.fiscal_submission_jobs;
create policy fiscal_submission_jobs_tenant on public.fiscal_submission_jobs
  for all
  using (public.tenant_row_visible(tenant_id))
  with check (public.tenant_row_visible(tenant_id));
