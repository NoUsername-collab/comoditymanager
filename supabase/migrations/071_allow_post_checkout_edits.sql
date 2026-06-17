-- After check-out, booking edits are locked unless user is owner or this flag is enabled.

alter table public.pension_settings
  add column if not exists allow_post_checkout_edits boolean not null default false;

comment on column public.pension_settings.allow_post_checkout_edits is
  'When false, only owner may edit bookings after check-out (times, dates, undo).';
