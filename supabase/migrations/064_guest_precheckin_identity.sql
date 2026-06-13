-- =============================================================================
-- 064 — Guest pre-check-in: date personale din aplicația recepție
-- =============================================================================

alter table public.guest_precheckin_submissions
  add column if not exists guest_last_name text,
  add column if not exists guest_first_name text,
  add column if not exists national_id text,
  add column if not exists birth_date date,
  add column if not exists nationality text;

comment on column public.guest_precheckin_submissions.guest_last_name is
  'Nume de familie — preluat din rezervare/profil sau confirmat de oaspete.';
comment on column public.guest_precheckin_submissions.guest_first_name is
  'Prenume — preluat din rezervare/profil sau confirmat de oaspete.';
