-- =============================================================================
-- 054 — Public site: templates, themes, sections, contact (owner-configurable)
-- Decoupled from admin appearance (no day/night on public).
-- =============================================================================

create table if not exists public.public_site_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,

  template_id text not null default 'classic'
    check (template_id in ('classic', 'editorial', 'immersive')),
  theme_id text not null default 'noir'
    check (theme_id in ('noir', 'alpine', 'mediterranean')),

  published boolean not null default true,
  booking_enabled boolean not null default true,
  booking_nav_position text not null default 'nav'
    check (booking_nav_position in ('nav', 'footer', 'both', 'hidden')),

  hero jsonb not null default '{}'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (tenant_id)
);

create table if not exists public.public_site_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,

  section_type text not null
    check (section_type in ('intro', 'benefits', 'gallery', 'text', 'cta', 'steps')),
  sort_order integer not null default 0,
  visible boolean not null default true,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_site_sections_tenant_sort_idx
  on public.public_site_sections (tenant_id, sort_order);

alter table public.public_site_settings enable row level security;
alter table public.public_site_sections enable row level security;

drop policy if exists tenant_isolation_public_site_settings on public.public_site_settings;
create policy tenant_isolation_public_site_settings
  on public.public_site_settings
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation_public_site_sections on public.public_site_sections;
create policy tenant_isolation_public_site_sections
  on public.public_site_sections
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop trigger if exists public_site_settings_updated_at on public.public_site_settings;
create trigger public_site_settings_updated_at
  before update on public.public_site_settings
  for each row execute function public.set_updated_at();

drop trigger if exists public_site_sections_updated_at on public.public_site_sections;
create trigger public_site_sections_updated_at
  before update on public.public_site_sections
  for each row execute function public.set_updated_at();

comment on table public.public_site_settings is
  'Owner-configurable public presentation site: template, theme, hero, contact, booking surplus.';
comment on table public.public_site_sections is
  'Ordered content sections for public home page (intro, benefits, gallery, etc.).';
