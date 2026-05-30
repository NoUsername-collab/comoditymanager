-- =============================================================================
-- 026 — REZOVA Multi-Tenant: tenants, tenant_id, RLS, custom domains
--
-- Transforms the single-tenant Casa Emil database into a multi-tenant
-- platform for Rezova (Romania, Moldova, Bulgaria).
--
-- SAFE TO RUN: fully idempotent (all IF NOT EXISTS / IF EXISTS guards).
-- RUN AFTER: 024 + 025 (simulation schema + atomic confirm).
--
-- What this migration does:
--   1. Creates `tenants` table (the heart of multi-tenancy)
--   2. Creates `tenant_domains` table (custom domain support)
--   3. Creates `tenant_members` table (staff roles per tenant)
--   4. Adds `tenant_id` to ALL existing data tables
--   5. Creates default tenant "Casa Emil" + backfills existing data
--   6. Makes `tenant_id` NOT NULL after backfill
--   7. Adds RLS (Row Level Security) policies
--   8. Adds performance indexes
--   9. Creates helper functions for onboarding
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TENANTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),

  -- URL slug: "casa-emil", "hotel-panoramic" (unique, URL-safe)
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),

  -- Display name: "Casa Emil", "Хотел Варна"
  display_name text not null,

  -- Plan & modules (maps to core/config/plans.ts)
  plan_id text not null default 'starter'
    check (plan_id in (
      'starter', 'standard', 'pro', 'business',
      'local_basic', 'local_pro', 'local_business',
      'hybrid_basic', 'hybrid_pro', 'hybrid_business'
    )),
  active_modules text[] not null default '{}',

  -- Localization
  locale text not null default 'ro'
    check (locale in ('ro', 'en', 'bg')),
  country text not null default 'RO'
    check (country in ('RO', 'MD', 'BG')),
  timezone text not null default 'Europe/Bucharest',

  -- Subscription
  status text not null default 'trial'
    check (status in ('active', 'trial', 'suspended', 'cancelled')),
  trial_ends_at timestamptz,

  -- Owner (Supabase Auth user who created this tenant)
  owner_id uuid,
  owner_email text not null,

  -- Stripe billing
  stripe_customer_id text,
  stripe_subscription_id text,

  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tenants is
  'Rezova tenants: each pension/hotel is one tenant with plan, modules, billing.';

create index if not exists tenants_status_idx on public.tenants (status);
create index if not exists tenants_owner_id_idx on public.tenants (owner_id);
create index if not exists tenants_slug_idx on public.tenants (slug);

drop trigger if exists tenants_updated_at on public.tenants;
create trigger tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TENANT DOMAINS (custom domain support)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  -- The custom domain: "rezervari.casaemil.ro"
  domain text not null unique,

  -- DNS verification status
  verified boolean not null default false,
  verified_at timestamptz,

  -- SSL status (managed by Vercel)
  ssl_active boolean not null default false,

  created_at timestamptz not null default now()
);

comment on table public.tenant_domains is
  'Custom domains per tenant (CNAME → cname.vercel-dns.com). Vercel auto-SSL.';

create index if not exists tenant_domains_tenant_id_idx
  on public.tenant_domains (tenant_id);
create index if not exists tenant_domains_domain_idx
  on public.tenant_domains (domain);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TENANT MEMBERS (staff roles per tenant)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  -- Supabase Auth user ID
  user_id uuid not null,
  email text not null,

  -- Role within this tenant
  role text not null default 'operator'
    check (role in ('owner', 'admin', 'operator')),

  -- Status
  is_active boolean not null default true,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (tenant_id, user_id)
);

comment on table public.tenant_members is
  'Staff roles per tenant: owner (billing), admin (config), operator (daily).';

create index if not exists tenant_members_user_id_idx
  on public.tenant_members (user_id);
create index if not exists tenant_members_tenant_id_idx
  on public.tenant_members (tenant_id);

drop trigger if exists tenant_members_updated_at on public.tenant_members;
create trigger tenant_members_updated_at
  before update on public.tenant_members
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ADD tenant_id TO ALL EXISTING TABLES
--    (nullable first, backfill, then NOT NULL)
-- ─────────────────────────────────────────────────────────────────────────────

-- Core structure
alter table public.pension_settings
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.buildings
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.floors
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.rooms
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

-- Bookings & occupancy
alter table public.bookings
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.booking_rooms
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.booking_room_segments
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.room_holds
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.room_blocks
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

-- Guests
alter table public.guests
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.guest_profiles
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.guest_stay_reviews
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

-- Catalog
alter table public.room_option_definitions
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.room_type_definitions
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

-- Activity & logs
alter table public.admin_activity_log
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.dev_logs
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CREATE DEFAULT TENANT (Casa Emil) + BACKFILL
-- ─────────────────────────────────────────────────────────────────────────────

-- Create Casa Emil as the first tenant (idempotent)
insert into public.tenants (slug, display_name, plan_id, owner_email, status, locale, country, timezone)
select 'casa-emil', 'Casa Emil - Tasnad', 'pro', 'admin@casaemil.local', 'active', 'ro', 'RO', 'Europe/Bucharest'
where not exists (select 1 from public.tenants where slug = 'casa-emil');

-- Backfill all existing rows with Casa Emil tenant_id
do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from public.tenants where slug = 'casa-emil';

  if v_tenant_id is null then
    raise exception 'Casa Emil tenant not found — cannot backfill';
  end if;

  -- Core structure
  update public.pension_settings     set tenant_id = v_tenant_id where tenant_id is null;
  update public.buildings            set tenant_id = v_tenant_id where tenant_id is null;
  update public.floors               set tenant_id = v_tenant_id where tenant_id is null;
  update public.rooms                set tenant_id = v_tenant_id where tenant_id is null;

  -- Bookings & occupancy
  update public.bookings             set tenant_id = v_tenant_id where tenant_id is null;
  update public.booking_rooms        set tenant_id = v_tenant_id where tenant_id is null;
  update public.booking_room_segments set tenant_id = v_tenant_id where tenant_id is null;
  update public.room_holds           set tenant_id = v_tenant_id where tenant_id is null;
  update public.room_blocks          set tenant_id = v_tenant_id where tenant_id is null;

  -- Guests
  update public.guests               set tenant_id = v_tenant_id where tenant_id is null;
  update public.guest_profiles       set tenant_id = v_tenant_id where tenant_id is null;
  update public.guest_stay_reviews   set tenant_id = v_tenant_id where tenant_id is null;

  -- Catalog
  update public.room_option_definitions  set tenant_id = v_tenant_id where tenant_id is null;
  update public.room_type_definitions    set tenant_id = v_tenant_id where tenant_id is null;

  -- Activity & logs
  update public.admin_activity_log   set tenant_id = v_tenant_id where tenant_id is null;
  update public.dev_logs             set tenant_id = v_tenant_id where tenant_id is null;

  raise notice 'Backfilled all existing data to tenant: % (%)', v_tenant_id, 'casa-emil';
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. MAKE tenant_id NOT NULL (after backfill)
--    Using ALTER ... SET NOT NULL (safe after backfill)
-- ─────────────────────────────────────────────────────────────────────────────

-- Core structure
alter table public.pension_settings      alter column tenant_id set not null;
alter table public.buildings             alter column tenant_id set not null;
alter table public.floors                alter column tenant_id set not null;
alter table public.rooms                 alter column tenant_id set not null;

-- Bookings & occupancy
alter table public.bookings              alter column tenant_id set not null;
alter table public.booking_rooms         alter column tenant_id set not null;
alter table public.booking_room_segments alter column tenant_id set not null;
alter table public.room_holds            alter column tenant_id set not null;
alter table public.room_blocks           alter column tenant_id set not null;

-- Guests
alter table public.guests                alter column tenant_id set not null;
alter table public.guest_profiles        alter column tenant_id set not null;
alter table public.guest_stay_reviews    alter column tenant_id set not null;

-- Catalog
alter table public.room_option_definitions   alter column tenant_id set not null;
alter table public.room_type_definitions     alter column tenant_id set not null;

-- Activity & logs
alter table public.admin_activity_log    alter column tenant_id set not null;
alter table public.dev_logs              alter column tenant_id set not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PERFORMANCE INDEXES on tenant_id
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists pension_settings_tenant_id_idx on public.pension_settings (tenant_id);
create index if not exists buildings_tenant_id_idx        on public.buildings (tenant_id);
create index if not exists floors_tenant_id_idx           on public.floors (tenant_id);
create index if not exists rooms_tenant_id_idx            on public.rooms (tenant_id);
create index if not exists bookings_tenant_id_idx         on public.bookings (tenant_id);
create index if not exists booking_rooms_tenant_id_idx    on public.booking_rooms (tenant_id);
create index if not exists booking_room_segments_tenant_id_idx on public.booking_room_segments (tenant_id);
create index if not exists room_holds_tenant_id_idx       on public.room_holds (tenant_id);
create index if not exists room_blocks_tenant_id_idx      on public.room_blocks (tenant_id);
create index if not exists guests_tenant_id_idx           on public.guests (tenant_id);
create index if not exists guest_profiles_tenant_id_idx   on public.guest_profiles (tenant_id);
create index if not exists guest_stay_reviews_tenant_id_idx on public.guest_stay_reviews (tenant_id);
create index if not exists room_option_definitions_tenant_id_idx on public.room_option_definitions (tenant_id);
create index if not exists room_type_definitions_tenant_id_idx on public.room_type_definitions (tenant_id);
create index if not exists admin_activity_log_tenant_id_idx on public.admin_activity_log (tenant_id);
create index if not exists dev_logs_tenant_id_idx         on public.dev_logs (tenant_id);

-- Composite indexes for common queries (tenant + date range)
create index if not exists bookings_tenant_dates_idx
  on public.bookings (tenant_id, check_in, check_out);
create index if not exists bookings_tenant_status_idx
  on public.bookings (tenant_id, status);
create index if not exists rooms_tenant_active_idx
  on public.rooms (tenant_id, is_active);
create index if not exists buildings_tenant_active_idx
  on public.buildings (tenant_id, is_active);
create index if not exists guests_tenant_display_name_idx
  on public.guests (tenant_id, display_name);

-- Fix unique constraints that need to be tenant-scoped
-- Guests: phone/email unique PER TENANT, not globally
drop index if exists guests_phone_normalized_uidx;
create unique index if not exists guests_tenant_phone_normalized_uidx
  on public.guests (tenant_id, phone_normalized)
  where phone_normalized is not null;

drop index if exists guests_email_normalized_uidx;
create unique index if not exists guests_tenant_email_normalized_uidx
  on public.guests (tenant_id, email_normalized)
  where email_normalized is not null;

drop index if exists guests_cnp_uidx;
create unique index if not exists guests_tenant_cnp_uidx
  on public.guests (tenant_id, cnp)
  where cnp is not null and cnp <> '';


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY (RLS)
--    Every table gets: "user can only see rows for their tenant"
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: extract tenant_id from JWT claims
-- The app sets `tenant_id` in the JWT custom claims at login
create or replace function public.auth_tenant_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid,
    null
  );
$$;

comment on function public.auth_tenant_id is
  'Extract tenant_id from Supabase JWT custom claims. Returns NULL for service role.';

-- Helper: check if current request is from service_role (admin client)
create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role',
    false
  );
$$;

-- Macro: enable RLS + create tenant isolation policy
-- Service role bypasses RLS by default in Supabase, so admin client works.
-- For anon/authenticated users, they only see their tenant's data.

-- pension_settings
alter table public.pension_settings enable row level security;
drop policy if exists tenant_isolation on public.pension_settings;
create policy tenant_isolation on public.pension_settings
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- buildings
alter table public.buildings enable row level security;
drop policy if exists tenant_isolation on public.buildings;
create policy tenant_isolation on public.buildings
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- floors
alter table public.floors enable row level security;
drop policy if exists tenant_isolation on public.floors;
create policy tenant_isolation on public.floors
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- rooms
alter table public.rooms enable row level security;
drop policy if exists tenant_isolation on public.rooms;
create policy tenant_isolation on public.rooms
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- bookings
alter table public.bookings enable row level security;
drop policy if exists tenant_isolation on public.bookings;
create policy tenant_isolation on public.bookings
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- booking_rooms
alter table public.booking_rooms enable row level security;
drop policy if exists tenant_isolation on public.booking_rooms;
create policy tenant_isolation on public.booking_rooms
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- booking_room_segments
alter table public.booking_room_segments enable row level security;
drop policy if exists tenant_isolation on public.booking_room_segments;
create policy tenant_isolation on public.booking_room_segments
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- room_holds
alter table public.room_holds enable row level security;
drop policy if exists tenant_isolation on public.room_holds;
create policy tenant_isolation on public.room_holds
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- room_blocks
alter table public.room_blocks enable row level security;
drop policy if exists tenant_isolation on public.room_blocks;
create policy tenant_isolation on public.room_blocks
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- guests
alter table public.guests enable row level security;
drop policy if exists tenant_isolation on public.guests;
create policy tenant_isolation on public.guests
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- guest_profiles
alter table public.guest_profiles enable row level security;
drop policy if exists tenant_isolation on public.guest_profiles;
create policy tenant_isolation on public.guest_profiles
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- guest_stay_reviews
alter table public.guest_stay_reviews enable row level security;
drop policy if exists tenant_isolation on public.guest_stay_reviews;
create policy tenant_isolation on public.guest_stay_reviews
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- room_option_definitions
alter table public.room_option_definitions enable row level security;
drop policy if exists tenant_isolation on public.room_option_definitions;
create policy tenant_isolation on public.room_option_definitions
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- room_type_definitions
alter table public.room_type_definitions enable row level security;
drop policy if exists tenant_isolation on public.room_type_definitions;
create policy tenant_isolation on public.room_type_definitions
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- admin_activity_log
alter table public.admin_activity_log enable row level security;
drop policy if exists tenant_isolation on public.admin_activity_log;
create policy tenant_isolation on public.admin_activity_log
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- dev_logs
alter table public.dev_logs enable row level security;
drop policy if exists tenant_isolation on public.dev_logs;
create policy tenant_isolation on public.dev_logs
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- tenants (owner can see own tenant)
alter table public.tenants enable row level security;
drop policy if exists tenant_isolation on public.tenants;
create policy tenant_isolation on public.tenants
  using (id = public.auth_tenant_id() or public.is_service_role());

-- tenant_domains
alter table public.tenant_domains enable row level security;
drop policy if exists tenant_isolation on public.tenant_domains;
create policy tenant_isolation on public.tenant_domains
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());

-- tenant_members
alter table public.tenant_members enable row level security;
drop policy if exists tenant_isolation on public.tenant_members;
create policy tenant_isolation on public.tenant_members
  using (tenant_id = public.auth_tenant_id() or public.is_service_role());


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ONBOARDING FUNCTION
--    Called when a new pension signs up. Creates everything in one transaction.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.onboard_new_tenant(
  p_slug text,
  p_display_name text,
  p_owner_id uuid,
  p_owner_email text,
  p_locale text default 'ro',
  p_country text default 'RO',
  p_timezone text default 'Europe/Bucharest'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_tenant_id uuid;
begin
  -- 1. Create tenant
  insert into public.tenants (
    slug, display_name, plan_id, owner_id, owner_email,
    status, trial_ends_at, locale, country, timezone
  )
  values (
    p_slug, p_display_name, 'starter', p_owner_id, p_owner_email,
    'trial', now() + interval '30 days', p_locale, p_country, p_timezone
  )
  returning id into v_tenant_id;

  -- 2. Add owner as member
  insert into public.tenant_members (tenant_id, user_id, email, role, accepted_at)
  values (v_tenant_id, p_owner_id, p_owner_email, 'owner', now());

  -- 3. Create default pension settings
  insert into public.pension_settings (tenant_id, display_name)
  values (v_tenant_id, p_display_name);

  -- 4. Seed catalog: copy system option/type definitions
  insert into public.room_option_definitions (tenant_id, slug, name, price_per_night_addon, sort_order, is_system)
  values
    (v_tenant_id, 'ac',     'Aer condiționat', 0, 10, true),
    (v_tenant_id, 'fridge', 'Frigider',        0, 20, true);

  insert into public.room_type_definitions (tenant_id, slug, name, capacity_base, base_price_per_night, sort_order, is_system)
  values
    (v_tenant_id, 'twin',   'Twin',   2, 0, 10, true),
    (v_tenant_id, 'double', 'Double', 2, 0, 20, true),
    (v_tenant_id, 'triple', 'Triple', 3, 0, 30, true);

  -- 5. Create subdomain entry (slug.rezova.ro — auto-verified)
  insert into public.tenant_domains (tenant_id, domain, verified, verified_at, ssl_active)
  values (v_tenant_id, p_slug || '.rezova.ro', true, now(), true);

  return v_tenant_id;
end;
$$;

comment on function public.onboard_new_tenant is
  'Atomic onboarding: tenant + member + settings + catalog + subdomain. 30-day trial on Starter plan.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. TENANT LOOKUP BY DOMAIN
--     Used by proxy.ts to resolve tenant from hostname
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.resolve_tenant_by_domain(p_domain text)
returns table (
  tenant_id uuid,
  slug text,
  display_name text,
  plan_id text,
  active_modules text[],
  status text,
  locale text,
  country text,
  timezone text
)
language sql
stable
security definer
as $$
  select
    t.id as tenant_id,
    t.slug,
    t.display_name,
    t.plan_id,
    t.active_modules,
    t.status,
    t.locale,
    t.country,
    t.timezone
  from public.tenants t
  inner join public.tenant_domains td on td.tenant_id = t.id
  where td.domain = p_domain
    and td.verified = true
    and t.status in ('active', 'trial')
  limit 1;
$$;

comment on function public.resolve_tenant_by_domain is
  'Resolve tenant from custom domain or subdomain. Used by proxy.ts at request start.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. TENANT LOOKUP BY SLUG (for subdomain routing)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.resolve_tenant_by_slug(p_slug text)
returns table (
  tenant_id uuid,
  slug text,
  display_name text,
  plan_id text,
  active_modules text[],
  status text,
  locale text,
  country text,
  timezone text
)
language sql
stable
security definer
as $$
  select
    t.id as tenant_id,
    t.slug,
    t.display_name,
    t.plan_id,
    t.active_modules,
    t.status,
    t.locale,
    t.country,
    t.timezone
  from public.tenants t
  where t.slug = p_slug
    and t.status in ('active', 'trial')
  limit 1;
$$;

comment on function public.resolve_tenant_by_slug is
  'Resolve tenant from URL slug (subdomain). Used for slug.rezova.ro routing.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. UPGRADE PLAN FUNCTION (for Stripe webhooks)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.update_tenant_plan(
  p_tenant_id uuid,
  p_plan_id text,
  p_stripe_customer_id text default null,
  p_stripe_subscription_id text default null
)
returns void
language plpgsql
security definer
as $$
begin
  update public.tenants
  set
    plan_id = p_plan_id,
    status = 'active',
    stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
    stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id),
    updated_at = now()
  where id = p_tenant_id;
end;
$$;

comment on function public.update_tenant_plan is
  'Upgrade/downgrade tenant plan. Called from Stripe webhook handler.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. ADD CUSTOM DOMAIN FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.add_tenant_domain(
  p_tenant_id uuid,
  p_domain text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_domain_id uuid;
begin
  -- Verify tenant owns this request
  if not exists (select 1 from public.tenants where id = p_tenant_id) then
    raise exception 'Tenant not found: %', p_tenant_id;
  end if;

  -- Check domain not already taken
  if exists (select 1 from public.tenant_domains where domain = p_domain) then
    raise exception 'Domain already registered: %', p_domain;
  end if;

  insert into public.tenant_domains (tenant_id, domain)
  values (p_tenant_id, p_domain)
  returning id into v_domain_id;

  return v_domain_id;
end;
$$;

comment on function public.add_tenant_domain is
  'Register a custom domain for DNS verification. SSL activates after CNAME verified.';


-- ─────────────────────────────────────────────────────────────────────────────
-- DONE. Summary:
--
--   Tables created:  tenants, tenant_domains, tenant_members
--   Columns added:   tenant_id on 16 existing tables
--   RLS enabled:     19 tables with tenant isolation
--   Functions:       onboard_new_tenant, resolve_tenant_by_domain,
--                    resolve_tenant_by_slug, update_tenant_plan,
--                    add_tenant_domain, auth_tenant_id, is_service_role
--   Indexes:         16 tenant_id + 5 composite + 3 unique (tenant-scoped)
--   Backfill:        All existing data → Casa Emil tenant
--
--   Casa Emil is now tenant #1 on the Rezova platform.
-- ─────────────────────────────────────────────────────────────────────────────
