-- Reset factory: șterge date operaționale, păstrează schema + un rând pension_settings.
-- Apelat doar din Server Action cu service_role (nu expune UI fără env flag).

create or replace function public.admin_factory_reset()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table
    public.admin_activity_log,
    public.room_holds,
    public.room_blocks,
    public.booking_room_segments,
    public.booking_rooms,
    public.bookings,
    public.guests,
    public.rooms,
    public.floors,
    public.buildings
  restart identity cascade;

  update public.pension_settings
  set
    display_name = 'Casa Emil',
    default_check_in_time = '14:00',
    default_check_out_time = '11:00',
    total_extra_beds_max = 2,
    admin_palette_source = 'catalog',
    admin_palette_key = 'default',
    admin_day_night = 'night',
    updated_at = now();

  if not found then
    insert into public.pension_settings (
      display_name,
      total_extra_beds_max,
      admin_palette_source,
      admin_palette_key,
      admin_day_night
    )
    values ('Casa Emil', 2, 'catalog', 'default', 'night');
  end if;
end;
$$;

comment on function public.admin_factory_reset is
  'Golește clădiri, camere, rezervări, clienți, hold/blocări, jurnal activitate. Păstrează conturile admin Supabase Auth.';

revoke all on function public.admin_factory_reset() from public;
revoke all on function public.admin_factory_reset() from anon, authenticated;
