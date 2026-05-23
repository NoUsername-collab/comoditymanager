-- Nume familie + prenume (afișare Gantt: „Popescu M.”)

alter table public.bookings
  add column if not exists guest_last_name text,
  add column if not exists guest_first_name text;

-- Backfill din guest_name existent (format: Nume Prenume…)
update public.bookings
set
  guest_last_name = split_part(trim(guest_name), ' ', 1),
  guest_first_name = trim(
    substring(
      trim(guest_name)
      from length(split_part(trim(guest_name), ' ', 1)) + 2
    )
  )
where guest_last_name is null
  and position(' ' in trim(guest_name)) > 0;

update public.bookings
set
  guest_last_name = trim(guest_name),
  guest_first_name = coalesce(guest_first_name, '')
where guest_last_name is null;
