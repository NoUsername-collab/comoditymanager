-- rooms.room_type: constraint legacy din v0.1 (double/triple/deluxe/other).
-- Catalogul folosește slug-uri libere (twin, family, …) + room_type_definition_id.
-- Păstrăm coloana pentru compatibilitate, dar oprim check-ul rigid.

alter table public.rooms
  drop constraint if exists rooms_room_type_check;

comment on column public.rooms.room_type is
  'Slug tip cameră (mirror catalog); sursa de adevăr: room_type_definition_id.';
