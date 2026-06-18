-- 078 — Canonical check-in/out times: default_check_in/out on pension_settings.
-- Deprecated mirrors: checkin_time_from, checkout_time_until (kept in sync).

update public.pension_settings
set
  default_check_in_time = coalesce(checkin_time_from, default_check_in_time),
  default_check_out_time = coalesce(checkout_time_until, default_check_out_time)
where checkin_time_from is not null
   or checkout_time_until is not null;

update public.pension_settings
set
  checkin_time_from = default_check_in_time,
  checkout_time_until = default_check_out_time;

create or replace function public.sync_pension_check_time_mirrors()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.checkin_time_from := new.default_check_in_time;
  new.checkout_time_until := new.default_check_out_time;
  return new;
end;
$$;

drop trigger if exists pension_settings_sync_check_times on public.pension_settings;
create trigger pension_settings_sync_check_times
  before insert or update of default_check_in_time, default_check_out_time
  on public.pension_settings
  for each row
  execute function public.sync_pension_check_time_mirrors();

comment on function public.sync_pension_check_time_mirrors is
  'Keeps legacy checkin_time_from/checkout_time_until aligned with default_check_in/out.';
