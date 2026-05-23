-- Fundație statistici pe termen lung: indexuri + moment confirmare (audit)

alter table public.bookings
  add column if not exists confirmed_at timestamptz;

comment on column public.bookings.confirmed_at is
  'Setat la confirmare; folosit în rapoarte (nu ștergeți rezervările confirmate).';

-- Backfill pentru rezervări deja confirmate
update public.bookings
set confirmed_at = coalesce(confirmed_at, updated_at)
where status = 'confirmata' and confirmed_at is null;

create index if not exists bookings_status_check_in_idx
  on public.bookings (status, check_in);

create index if not exists bookings_created_at_idx
  on public.bookings (created_at);

create index if not exists bookings_confirmed_at_idx
  on public.bookings (confirmed_at)
  where status = 'confirmata';
