-- 107 — Baby cots, a people limit per room, and optional fees.
-- Cots are not extra beds: a room says how many cots fit in it, the property
-- says how many cots it owns (like total_extra_beds_max for extra beds).
-- What each stay uses is worked out from its party and rooms, not stored.

alter table public.rooms
  add column if not exists max_cots smallint not null default 0,
  add column if not exists max_occupancy smallint;

alter table public.rooms drop constraint if exists rooms_max_cots_check;
alter table public.rooms add constraint rooms_max_cots_check
  check (max_cots between 0 and 4);

alter table public.rooms drop constraint if exists rooms_max_occupancy_check;
alter table public.rooms add constraint rooms_max_occupancy_check
  check (max_occupancy is null or max_occupancy between 1 and 30);

comment on column public.rooms.max_cots is
  'Câte pătuțuri de bebeluș încap în cameră. Pătuțul nu e pat suplimentar.';
comment on column public.rooms.max_occupancy is
  'Maxim persoane în cameră, inclusiv copii și bebeluși. NULL = doar limita paturilor.';

alter table public.pension_settings
  add column if not exists total_cots_max smallint not null default 0,
  add column if not exists infants_with_parents boolean not null default true,
  add column if not exists extra_bed_fee numeric(10, 2) not null default 0,
  add column if not exists cot_fee numeric(10, 2) not null default 0;

alter table public.pension_settings drop constraint if exists pension_settings_cots_fees_check;
alter table public.pension_settings add constraint pension_settings_cots_fees_check check (
  total_cots_max between 0 and 999
  and extra_bed_fee between 0 and 10000
  and cot_fee between 0 and 10000
);

comment on column public.pension_settings.total_cots_max is
  'Câte pătuțuri de bebeluș are pensiunea în total. 0 = niciunul.';
comment on column public.pension_settings.infants_with_parents is
  'Bebelușul poate dormi în patul părinților (câte unul de adult), fără pătuț.';
comment on column public.pension_settings.extra_bed_fee is
  'Taxă pe pat suplimentar pe noapte (RON). 0 = inclus în prețul camerei.';
comment on column public.pension_settings.cot_fee is
  'Taxă pe pătuț pe noapte (RON). 0 = gratuit.';
