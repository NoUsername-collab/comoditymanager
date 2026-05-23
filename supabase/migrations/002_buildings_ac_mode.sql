-- Faza A: politică AC la nivel de clădire
-- all_rooms = camere noi implicit cu AC
-- none = fără AC implicit
-- per_room = alegi per cameră la creare

alter table public.buildings
  add column if not exists ac_mode text not null default 'per_room'
  check (ac_mode in ('all_rooms', 'none', 'per_room'));

comment on column public.buildings.ac_mode is
  'all_rooms | none | per_room — default AC pentru camere noi';
