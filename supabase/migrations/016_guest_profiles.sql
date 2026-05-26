-- Clienti v2: profil reputatie/fidelitate + review per sejur + snapshot alerta pe booking

create table if not exists public.guest_profiles (
  guest_id uuid primary key references public.guests (id) on delete cascade,

  trust_score smallint not null default 60 check (trust_score between 0 and 100),
  loyalty_score smallint not null default 0 check (loyalty_score between 0 and 100),
  stars_avg numeric(3,1) not null default 0 check (stars_avg between 0 and 5),

  positive_traits text[] not null default '{}',
  negative_traits text[] not null default '{}',

  flag_level text not null default 'normal'
    check (flag_level in ('normal', 'watchlist', 'blacklist')),
  blacklist_reason text,
  blacklisted_at timestamptz,
  blacklisted_by uuid,
  blacklisted_by_email text,
  unblacklisted_at timestamptz,
  unblacklisted_by uuid,
  unblacklisted_by_email text,

  manual_trust_adjustment integer not null default 0,
  manual_loyalty_adjustment integer not null default 0,
  manual_note text,

  completed_stays integer not null default 0,
  total_nights integer not null default 0,
  last_stay_check_out date,
  review_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.guest_profiles is
  'Snapshot rapid pentru UI: scor comportament, fidelitate, stele, traits active si flag manual.';

create index if not exists guest_profiles_flag_level_idx
  on public.guest_profiles (flag_level);

create index if not exists guest_profiles_trust_score_idx
  on public.guest_profiles (trust_score);

create index if not exists guest_profiles_loyalty_score_idx
  on public.guest_profiles (loyalty_score);

drop trigger if exists guest_profiles_updated_at on public.guest_profiles;
create trigger guest_profiles_updated_at
  before update on public.guest_profiles
  for each row execute function public.set_updated_at();

insert into public.guest_profiles (guest_id)
select g.id
from public.guests g
where not exists (
  select 1 from public.guest_profiles gp where gp.guest_id = g.id
);

create table if not exists public.guest_stay_reviews (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  guest_id uuid not null references public.guests (id) on delete cascade,

  stars smallint not null check (stars between 1 and 5),
  positive_traits text[] not null default '{}',
  negative_traits text[] not null default '{}',
  problem_details text,
  trust_delta integer not null default 0,
  loyalty_delta integer not null default 0,

  reviewed_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_by_email text,
  updated_at timestamptz not null default now()
);

comment on table public.guest_stay_reviews is
  'Evaluare internă per sejur: stele, traits, probleme și ajustări de scor.';

create index if not exists guest_stay_reviews_guest_id_idx
  on public.guest_stay_reviews (guest_id, reviewed_at desc);

drop trigger if exists guest_stay_reviews_updated_at on public.guest_stay_reviews;
create trigger guest_stay_reviews_updated_at
  before update on public.guest_stay_reviews
  for each row execute function public.set_updated_at();

alter table public.bookings
  add column if not exists guest_alert_level text not null default 'normal'
    check (guest_alert_level in ('normal', 'watchlist', 'blacklist'));

alter table public.bookings
  add column if not exists guest_alert_note text;

create index if not exists bookings_guest_alert_level_idx
  on public.bookings (guest_alert_level);
