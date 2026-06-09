-- 053: Extinde group_checkin_mode cu per_room (reprezentant per cameră)

alter table public.pension_settings
  drop constraint if exists pension_settings_group_checkin_mode_check;

alter table public.pension_settings
  add constraint pension_settings_group_checkin_mode_check
  check (group_checkin_mode in ('rep', 'individual', 'per_room', 'both'));

comment on column public.pension_settings.group_checkin_mode is
  'rep=doar titular; individual=toți oaspeții; per_room=reprezentant/cameră; both=recepția alege';
