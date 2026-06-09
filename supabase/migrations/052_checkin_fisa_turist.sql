-- 052: Check-in fișă turist (ANAF OPANAF 381/2026) — CNP, date extinse, setări unitate

alter table public.pension_settings
  add column if not exists checkin_cnp_rule text not null default 'required'
    check (checkin_cnp_rule in ('required', 'recommended', 'optional')),
  add column if not exists fisa_property_address text,
  add column if not exists fisa_owner_cui text,
  add column if not exists fisa_tourism_license text;

comment on column public.pension_settings.checkin_cnp_rule is
  'Regulă CNP la check-in. Cetățenii RO au CNP obligatoriu indiferent de setare (OPANAF 381/2026).';

alter table public.checkin_guests
  add column if not exists last_name text,
  add column if not exists first_name text,
  add column if not exists national_id text,
  add column if not exists document_series text,
  add column if not exists room_label text;

comment on column public.checkin_guests.national_id is
  'CNP sau cod personal; obligatoriu pentru cetățeni RO la fișa de cazare.';
