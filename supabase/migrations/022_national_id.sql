-- National ID — generalizare CNP pentru multi-țară (RO, MD, BG, GR, HU)

-- Tip cod personal: cnp, idnp, egn, amka, szemelyi_szam
alter table public.guests
  add column if not exists national_id_type text
    check (national_id_type is null or national_id_type in (
      'cnp', 'idnp', 'egn', 'amka', 'szemelyi_szam'
    ));

-- Valoarea codului personal (unic pe tip)
alter table public.guests
  add column if not exists national_id text;

-- Index unic compus: (national_id_type, national_id) — fiecare cod e unic global
create unique index if not exists guests_national_id_uidx
  on public.guests (national_id_type, national_id)
  where national_id is not null and national_id <> '';

-- Migrare date existente: cnp → national_id
update public.guests
set national_id_type = 'cnp',
    national_id = cnp
where cnp is not null
  and cnp <> ''
  and national_id is null;

comment on column public.guests.national_id_type is
  'Tipul codului personal: cnp=România, idnp=Moldova, egn=Bulgaria, amka=Grecia, szemelyi_szam=Ungaria.';

comment on column public.guests.national_id is
  'Codul personal unic pe viață — folosit ca cheie primară de deduplicare.';
