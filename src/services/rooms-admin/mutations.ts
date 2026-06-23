import {
  calculatePriceFromCatalog,
  getBuildingOptionPolicies,
  hasAcFromOptions,
  listRoomOptions,
  listRoomTypes,
  setRoomEnabledOptions,
} from "@/services/room-catalog";
import { legacyRoomTypeFromCatalogSlug } from "@/domain/room/legacy-room-type";
import { getTenantScope } from "@/lib/tenant/scope";

import { countLockingBookingRooms } from "./shared";

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
  const [[types, options, policies], { tenantId, supabase }] = await Promise.all([
    Promise.all([
      listRoomTypes(),
      listRoomOptions(),
      getBuildingOptionPolicies(input.building_id),
    ]),
    getTenantScope(),
  ]);
  const type = input.room_type_definition_id
    ? types.find((t) => t.id === input.room_type_definition_id) ?? null
    : null;

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
  const room_type = legacyRoomTypeFromCatalogSlug(type?.slug);
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
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) throw new Error(error.message);
  await setRoomEnabledOptions(id, input.enabled_option_ids);
}

export async function assignRoomToFloor(
  roomId: string,
  floorId: string | null
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id, building_id")
    .eq("tenant_id", tenantId)
    .eq("id", roomId)
    .maybeSingle();
  if (roomErr) throw new Error(roomErr.message);
  if (!room) throw new Error("rooms.not_found");

  if (floorId) {
    const { data: floor, error: floorErr } = await supabase
      .from("floors")
      .select("id, building_id")
      .eq("tenant_id", tenantId)
      .eq("id", floorId)
      .eq("is_active", true)
      .maybeSingle();
    if (floorErr) throw new Error(floorErr.message);
    if (!floor || floor.building_id !== room.building_id) {
      throw new Error("floors.building_mismatch");
    }
  }

  const { error } = await supabase
    .from("rooms")
    .update({ floor_id: floorId })
    .eq("tenant_id", tenantId)
    .eq("id", roomId);
  if (error) throw new Error(error.message);
}

export async function setRoomActive(
  id: string,
  is_active: boolean
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("rooms")
    .update({ is_active })
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRoom(id: string): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();

  const lockingCount = await countLockingBookingRooms([id]);
  if (lockingCount > 0) {
    throw new Error(
      "rooms.cannot_delete_room_with_bookings_disable_instead"
    );
  }

  await setRoomEnabledOptions(id, []);
  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
