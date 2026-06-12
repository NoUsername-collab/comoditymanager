-- Chei înmânate per cameră la check-in (sesiune).

alter table public.checkins
  add column if not exists keys_handed_rooms text[] not null default '{}';

comment on column public.checkins.keys_handed_rooms is
  'Camerele pentru care s-a confirmat înmânarea cheii/codului în această sesiune.';
