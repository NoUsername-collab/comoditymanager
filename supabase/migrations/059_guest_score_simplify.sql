-- Simplify guest scoring: stars = general score; deprecate trust/loyalty deltas.

comment on column public.guest_profiles.trust_score is
  'Deprecated — no longer computed. Kept for rollback.';
comment on column public.guest_profiles.loyalty_score is
  'Deprecated — no longer computed. Kept for rollback.';
comment on column public.guest_profiles.manual_trust_adjustment is
  'Deprecated — manual score adjustments removed.';
comment on column public.guest_profiles.manual_loyalty_adjustment is
  'Deprecated — manual score adjustments removed.';
comment on column public.guest_stay_reviews.trust_delta is
  'Deprecated — no longer used in scoring.';
comment on column public.guest_stay_reviews.loyalty_delta is
  'Deprecated — no longer used in scoring.';

update public.guest_stay_reviews
set trust_delta = 0,
    loyalty_delta = 0
where trust_delta <> 0 or loyalty_delta <> 0;

update public.guest_profiles
set manual_trust_adjustment = 0,
    manual_loyalty_adjustment = 0
where manual_trust_adjustment <> 0 or manual_loyalty_adjustment <> 0;

-- Recompute stars_avg and review_count from reviews (single source of truth).
update public.guest_profiles gp
set stars_avg = coalesce(sub.avg_stars, 0),
    review_count = coalesce(sub.review_count, 0)
from (
  select
    guest_id,
    round(avg(stars)::numeric, 1) as avg_stars,
    count(*)::integer as review_count
  from public.guest_stay_reviews
  group by guest_id
) sub
where gp.guest_id = sub.guest_id;

update public.guest_profiles
set stars_avg = 0,
    review_count = 0
where guest_id not in (select distinct guest_id from public.guest_stay_reviews);
