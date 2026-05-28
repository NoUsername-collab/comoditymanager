-- Guest Identity — documente, CNP, date personale complete pentru check-in

-- Status identitate pe guests
alter table public.guests
  add column if not exists identity_status text not null default 'draft'
    check (identity_status in ('draft', 'partial', 'complete'));

-- Document identitate
alter table public.guests
  add column if not exists doc_type text
    check (doc_type is null or doc_type in ('ci', 'passport', 'foreign_id', 'other'));

alter table public.guests
  add column if not exists doc_series text;
alter table public.guests
  add column if not exists doc_number text;
alter table public.guests
  add column if not exists doc_issued_by text;
alter table public.guests
  add column if not exists doc_issue_date date;
alter table public.guests
  add column if not exists doc_expiry_date date;

-- Date personale
alter table public.guests
  add column if not exists cnp text;
alter table public.guests
  add column if not exists birth_date date;
alter table public.guests
  add column if not exists birth_place text;
alter table public.guests
  add column if not exists nationality text;
alter table public.guests
  add column if not exists address text;
alter table public.guests
  add column if not exists city text;
alter table public.guests
  add column if not exists county text;
alter table public.guests
  add column if not exists country text default 'RO';

-- Sex (extras din CNP sau manual)
alter table public.guests
  add column if not exists sex text
    check (sex is null or sex in ('M', 'F'));

-- Index pe CNP (unic dacă nu e null)
create unique index if not exists guests_cnp_uidx
  on public.guests (cnp)
  where cnp is not null and cnp <> '';

-- Index pe doc_number
create index if not exists guests_doc_number_idx
  on public.guests (doc_number)
  where doc_number is not null and doc_number <> '';

-- Update identity_status pe baza datelor existente
update public.guests
set identity_status = 'draft'
where cnp is null and doc_number is null;

comment on column public.guests.identity_status is
  'draft=doar contact, partial=unele date identitate, complete=toate datele check-in.';

comment on column public.guests.doc_type is
  'ci=Carte Identitate RO, passport=Pașaport, foreign_id=Act străin, other=Altul.';

-- Relaxare constraint: la draft nu mai cerem contact obligatoriu
-- (operatorul poate crea guest cu doar numele la recepție)
alter table public.guests
  drop constraint if exists guests_contact_required;
