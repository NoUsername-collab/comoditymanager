-- 067: Setări noi check-in — regula de chei + persoane identificate per cameră

-- Regula de distribuire chei
alter table public.pension_settings
  add column if not exists checkin_key_rule text not null default 'always';

alter table public.pension_settings
  add constraint pension_settings_checkin_key_rule_check
  check (checkin_key_rule in ('always', 'id_verified', 'paid'));

comment on column public.pension_settings.checkin_key_rule is
  'always=chei fără condiții; id_verified=doar camere cu ID verificat; paid=doar dacă plata e suficientă';

-- Persoane identificate per cameră
alter table public.pension_settings
  add column if not exists checkin_ids_per_room text not null default 'one';

alter table public.pension_settings
  add constraint pension_settings_checkin_ids_per_room_check
  check (checkin_ids_per_room in ('one', 'two_non_family'));

comment on column public.pension_settings.checkin_ids_per_room is
  'one=1 persoană identificată/cameră; two_non_family=2 pentru non-familie, 1 pentru familie';

-- Coloană pregătitoare pentru valori custom
alter table public.pension_settings
  add column if not exists checkin_ids_per_room_custom integer default null;

-- Default group_checkin_mode → per_room pentru tenanți noi
alter table public.pension_settings
  alter column group_checkin_mode set default 'per_room';
