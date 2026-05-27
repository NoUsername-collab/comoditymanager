-- Check-in / check-out operațional (sosire / plecare efectivă)

alter table public.bookings
  add column if not exists actual_check_in_at timestamptz,
  add column if not exists actual_check_out_at timestamptz,
  add column if not exists actual_check_in_by uuid,
  add column if not exists actual_check_out_by uuid;

alter table public.bookings
  drop constraint if exists bookings_checkout_requires_checkin;

alter table public.bookings
  add constraint bookings_checkout_requires_checkin
  check (actual_check_out_at is null or actual_check_in_at is not null);

alter table public.bookings
  drop constraint if exists bookings_checkout_after_checkin;

alter table public.bookings
  add constraint bookings_checkout_after_checkin
  check (
    actual_check_out_at is null
    or actual_check_in_at is null
    or actual_check_out_at >= actual_check_in_at
  );

comment on column public.bookings.actual_check_in_at is
  'Moment operațional sosire (recepție), independent de data planificată check_in.';
comment on column public.bookings.actual_check_out_at is
  'Moment operațional plecare (recepție), independent de data planificată check_out.';
