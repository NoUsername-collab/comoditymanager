-- Înlocuiește trăsăturile predefinite cu note pozitive/negative libere per review.

alter table public.guest_stay_reviews
  add column if not exists positive_note text,
  add column if not exists negative_note text;

update public.guest_stay_reviews
set negative_note = problem_details
where problem_details is not null
  and trim(problem_details) <> ''
  and (negative_note is null or trim(negative_note) = '');

alter table public.guest_stay_reviews
  drop column if exists positive_traits,
  drop column if exists negative_traits,
  drop column if exists problem_details;

alter table public.guest_profiles
  drop column if exists positive_traits,
  drop column if exists negative_traits,
  drop column if exists manual_positive_traits,
  drop column if exists manual_negative_traits;

comment on table public.guest_stay_reviews is
  'Evaluare internă per sejur: stele, note pozitive/negative și ajustări de scor.';

comment on table public.guest_profiles is
  'Snapshot rapid pentru UI: scor comportament, fidelitate, stele și flag manual.';
