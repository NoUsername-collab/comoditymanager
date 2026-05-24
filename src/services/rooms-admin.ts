import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculatePriceFromCatalog,
  getRoomEnabledOptionIds,
  hasAcFromOptions,
  listRoomOptions,
  listRoomTypes,
  setRoomEnabledOptions,
} from "@/services/room-catalog";
import type { Room } from "@/types/database";

export type CreateRoomInput = {
  building_id: string;
  floor_id: string | null;
  name: string;
  room_type_definition_id: string | null;
  capacity_base: number;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  enabled_option_ids: string[];
  price_per_night: number;
  sort_order: number;
  building_default_price?: number;
};

export async function listAllRooms(): Promise<
  (Room & {
    building_name: string;
    floor_name: string | null;
    room_type_name: string | null;
  })[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .select(
      `
      id, building_id, floor_id, name, room_type, room_type_definition_id, capacity_base,
      allows_extra_beds, max_extra_beds_per_room, has_ac, price_per_night,
      is_active, sort_order,
      buildings ( name ),
      floors ( name ),
      room_type_definitions ( name )
    `
    )
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const b = row.buildings as { name: string } | { name: string }[] | null;
    const f = row.floors as { name: string } | { name: string }[] | null;
    const t = row.room_type_definitions as
      | { name: string }
      | { name: string }[]
      | null;
    const typeName = Array.isArray(t) ? t[0]?.name : t?.name;
    return {
      id: row.id,
      building_id: row.building_id,
      floor_id: row.floor_id,
      name: row.name,
      room_type: row.room_type,
      capacity_base: row.capacity_base,
      allows_extra_beds: row.allows_extra_beds,
      max_extra_beds_per_room: row.max_extra_beds_per_room,
      has_ac: row.has_ac,
      price_per_night: Number(row.price_per_night),
      is_active: row.is_active,
      sort_order: row.sort_order,
      building_name: Array.isArray(b) ? b[0]?.name ?? "?" : b?.name ?? "?",
      floor_name: Array.isArray(f) ? f[0]?.name ?? null : f?.name ?? null,
      room_type_name: typeName ?? null,
    };
  });
}

async function resolveRoomInsertFields(input: CreateRoomInput) {
  const [types, options] = await Promise.all([listRoomTypes(), listRoomOptions()]);
  const type = input.room_type_definition_id
    ? types.find((t) => t.id === input.room_type_definition_id) ?? null
    : null;

  const policies = await import("@/services/room-catalog").then((m) =>
    m.getBuildingOptionPolicies(input.building_id)
  );

  const price =
    input.price_per_night > 0
      ? input.price_per_night
      : calculatePriceFromCatalog({
          type,
          buildingDefaultPrice: input.building_default_price ?? 0,
          options,
          policies,
          typeDefaultOptionIds: type?.default_option_ids ?? [],
          selectedOptionIds: input.enabled_option_ids,
        });

  const capacity = type?.capacity_base ?? input.capacity_base;
  const room_type = type?.slug ?? "double";
  const has_ac = hasAcFromOptions(options, input.enabled_option_ids);

  return { type, price, capacity, room_type, has_ac, options };
}

export async function createRoom(input: CreateRoomInput): Promise<{ id: string }> {
  const { type, price, capacity, room_type, has_ac } =
    await resolveRoomInsertFields(input);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      building_id: input.building_id,
      floor_id: input.floor_id || null,
      name: input.name.trim(),
      room_type,
      room_type_definition_id: type?.id ?? null,
      capacity_base: capacity,
      allows_extra_beds: input.allows_extra_beds,
      max_extra_beds_per_room: input.allows_extra_beds
        ? input.max_extra_beds_per_room
        : 0,
      has_ac,
      price_per_night: price,
      sort_order: input.sort_order,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await setRoomEnabledOptions(data.id, input.enabled_option_ids);
  return { id: data.id };
}

export async function createRoomsBulk(input: {
  building_id: string;
  floor_id: string | null;
  room_type_definition_id: string;
  count: number;
  name_prefix: string;
  start_number: number;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  enabled_option_ids: string[];
  price_per_night: number;
  sort_order_start: number;
  building_default_price?: number;
}): Promise<{ ids: string[] }> {
  if (input.count < 1 || input.count > 50) {
    throw new Error("Număr camere: între 1 și 50");
  }

  const ids: string[] = [];
  for (let i = 0; i < input.count; i++) {
    const num = input.start_number + i;
    const name = `${input.name_prefix}${num}`.trim();
    const room = await createRoom({
      building_id: input.building_id,
      floor_id: input.floor_id,
      name,
      room_type_definition_id: input.room_type_definition_id,
      capacity_base: 2,
      allows_extra_beds: input.allows_extra_beds,
      max_extra_beds_per_room: input.max_extra_beds_per_room,
      enabled_option_ids: input.enabled_option_ids,
      price_per_night: input.price_per_night,
      sort_order: input.sort_order_start + i,
      building_default_price: input.building_default_price,
    });
    ids.push(room.id);
  }
  return { ids };
}

export async function getRoomById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .select(
      "id, building_id, floor_id, name, room_type, room_type_definition_id, capacity_base, allows_extra_beds, max_extra_beds_per_room, has_ac, price_per_night, is_active, sort_order, buildings ( ac_mode )"
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  const b = data.buildings as { ac_mode: string } | { ac_mode: string }[] | null;
  const ac_mode = Array.isArray(b) ? b[0]?.ac_mode : b?.ac_mode;
  const enabled_option_ids = await getRoomEnabledOptionIds(id);

  return {
    ...data,
    building_ac_mode: ac_mode ?? "per_room",
    enabled_option_ids,
  };
}

export async function updateRoom(
  id: string,
  input: {
    building_id: string;
    floor_id: string | null;
    name: string;
    room_type_definition_id: string | null;
    capacity_base: number;
    allows_extra_beds: boolean;
    max_extra_beds_per_room: number;
    enabled_option_ids: string[];
    price_per_night: number;
    sort_order: number;
    is_active: boolean;
    building_default_price?: number;
  }
): Promise<void> {
  const [types, options] = await Promise.all([listRoomTypes(), listRoomOptions()]);
  const type = input.room_type_definition_id
    ? types.find((t) => t.id === input.room_type_definition_id) ?? null
    : null;
  const policies = await import("@/services/room-catalog").then((m) =>
    m.getBuildingOptionPolicies(input.building_id)
  );

  const price =
    input.price_per_night > 0
      ? input.price_per_night
      : calculatePriceFromCatalog({
          type,
          buildingDefaultPrice: input.building_default_price ?? 0,
          options,
          policies,
          typeDefaultOptionIds: type?.default_option_ids ?? [],
          selectedOptionIds: input.enabled_option_ids,
        });

  const has_ac = hasAcFromOptions(options, input.enabled_option_ids);
  const capacity = type?.capacity_base ?? input.capacity_base;
  const room_type = type?.slug ?? "double";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("rooms")
    .update({
      building_id: input.building_id,
      floor_id: input.floor_id || null,
      name: input.name.trim(),
      room_type,
      room_type_definition_id: type?.id ?? null,
      capacity_base: capacity,
      allows_extra_beds: input.allows_extra_beds,
      max_extra_beds_per_room: input.allows_extra_beds
        ? input.max_extra_beds_per_room
        : 0,
      has_ac,
      price_per_night: price,
      sort_order: input.sort_order,
      is_active: input.is_active,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  await setRoomEnabledOptions(id, input.enabled_option_ids);
}

export async function deleteRoom(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { count, error: brErr } = await supabase
    .from("booking_rooms")
    .select("id", { count: "exact", head: true })
    .eq("room_id", id);

  if (brErr) throw new Error(brErr.message);
  if ((count ?? 0) > 0) {
    throw new Error(
      "Camera apare în rezervări. Dezactiveaz-o din Edit în loc să o ștergi."
    );
  }

  await supabase.from("room_enabled_options").delete().eq("room_id", id);
  const { error } = await supabase.from("rooms").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
