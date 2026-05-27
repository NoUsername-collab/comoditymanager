-- Guest profiles: standard default rating is 1 star before the first review.

alter table public.guest_profiles
  alter column stars_avg set default 1;

update public.guest_profiles
set stars_avg = 1
where review_count = 0
  and stars_avg = 0;
