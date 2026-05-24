-- Clienți (guests) + legătură bookings.guest_id — Phase 6 timeline v0.2

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),

  last_name text not null default '',
  first_name text not null default '',
  display_name text not null,

  phone text,
  phone_normalized text,
  email text,
  email_normalized text,

  notes text,
  tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint guests_contact_required check (
    phone_normalized is not null or email_normalized is not null
  )
);

comment on table public.guests is
  'Profil client: telefon (E.164) și/sau email, istoric rezervări via bookings.guest_id.';

create unique index if not exists guests_phone_normalized_uidx
  on public.guests (phone_normalized)
  where phone_normalized is not null;

create unique index if not exists guests_email_normalized_uidx
  on public.guests (email_normalized)
  where email_normalized is not null;

create index if not exists guests_display_name_idx
  on public.guests (display_name);

drop trigger if exists guests_updated_at on public.guests;
create trigger guests_updated_at
  before update on public.guests
  for each row execute function public.set_updated_at();

alter table public.bookings
  add column if not exists guest_id uuid references public.guests (id) on delete set null;

create index if not exists bookings_guest_id_idx on public.bookings (guest_id);

-- Backfill: un guest per email distinct (excl. placeholder recepție)
insert into public.guests (
  last_name,
  first_name,
  display_name,
  email,
  email_normalized,
  phone,
  phone_normalized
)
select distinct on (lower(trim(b.guest_email)))
  coalesce(nullif(trim(b.guest_last_name), ''), split_part(trim(b.guest_name), ' ', 1), ''),
  coalesce(nullif(trim(b.guest_first_name), ''), ''),
  trim(b.guest_name),
  trim(b.guest_email),
  lower(trim(b.guest_email)),
  nullif(trim(b.guest_phone), ''),
  null
from public.bookings b
where trim(b.guest_email) <> ''
  and lower(trim(b.guest_email)) <> 'receptie@casaemil.local'
  and not exists (
    select 1
    from public.guests g
    where g.email_normalized = lower(trim(b.guest_email))
  )
order by lower(trim(b.guest_email)), b.created_at desc;

update public.bookings b
set guest_id = g.id
from public.guests g
where b.guest_id is null
  and lower(trim(b.guest_email)) = g.email_normalized
  and lower(trim(b.guest_email)) <> 'receptie@casaemil.local';

-- Activity log: entity guest
alter table public.admin_activity_log
  drop constraint if exists admin_activity_log_entity_type_check;

alter table public.admin_activity_log
  add constraint admin_activity_log_entity_type_check
  check (entity_type in (
    'booking', 'building', 'room', 'floor', 'settings', 'session', 'pension', 'guest'
  ));
