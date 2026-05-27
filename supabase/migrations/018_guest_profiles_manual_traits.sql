-- Guest profiles: allow manual traits from the guest profile page,
-- independent of end-of-stay reviews.

alter table public.guest_profiles
  add column if not exists manual_positive_traits text[] not null default '{}';

alter table public.guest_profiles
  add column if not exists manual_negative_traits text[] not null default '{}';
