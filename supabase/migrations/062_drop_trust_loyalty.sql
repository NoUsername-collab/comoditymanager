-- Remove legacy trust/loyalty scoring; stays stats remain on guest_profiles.

drop index if exists public.guest_profiles_trust_score_idx;
drop index if exists public.guest_profiles_loyalty_score_idx;

alter table public.guest_profiles
  drop column if exists trust_score,
  drop column if exists loyalty_score,
  drop column if exists manual_trust_adjustment,
  drop column if exists manual_loyalty_adjustment;

alter table public.guest_stay_reviews
  drop column if exists trust_delta,
  drop column if exists loyalty_delta;

-- Recompute completed stay stats from confirmed past bookings (single source of truth).
update public.guest_profiles gp
set
  completed_stays = coalesce(sub.completed_stays, 0),
  total_nights = coalesce(sub.total_nights, 0),
  last_stay_check_out = sub.last_stay_check_out
from (
  select
    guest_id,
    count(*)::integer as completed_stays,
    coalesce(sum((check_out::date - check_in::date)), 0)::integer as total_nights,
    max(check_out::date) as last_stay_check_out
  from public.bookings
  where status = 'confirmata'
    and guest_id is not null
    and check_out < current_date
  group by guest_id
) sub
where gp.guest_id = sub.guest_id;

update public.guest_profiles
set
  completed_stays = 0,
  total_nights = 0,
  last_stay_check_out = null
where guest_id not in (
  select distinct guest_id
  from public.bookings
  where status = 'confirmata'
    and guest_id is not null
    and check_out < current_date
);
