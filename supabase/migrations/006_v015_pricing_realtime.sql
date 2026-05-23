-- v0.1.5: preț implicit clădire + Realtime pe rezervări

alter table public.buildings
  add column if not exists default_price_per_night numeric(10, 2) not null default 0;

comment on column public.buildings.default_price_per_night is
  'Preț/noapte implicit pentru camere noi; fiecare cameră poate fi editată individual.';

-- Supabase Realtime: admin se actualizează la cereri noi / modificări
do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null;
end $$;
