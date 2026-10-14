import { cache } from "react";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import {
  partyFromBooking,
  type ChildPolicy,
} from "@/domain/availability/party";
import {
  inventoryInUse,
  remainingInventory,
  type OverlappingStay,
} from "@/domain/availability/shared-inventory";
import {
  UNLIMITED_INVENTORY,
  type RoomCapacity,
  type SharedInventory,
} from "@/domain/availability/stay-capacity";
import { getPensionSettings } from "@/services/pension-settings";
import { getRoomOccupancy } from "@/services/room-occupancy";
import { listAllRoomsForTenant } from "@/services/rooms-admin";

const loadFreeStock = cache(async (
  checkIn: string,
  checkOut: string,
  excludeBookingId: string,
  policyKey: string,
): Promise<SharedInventory> => {
  const policy = JSON.parse(policyKey) as ChildPolicy;
  const tenantId = await resolveTenantIdForData();
  const [settings, segments, rooms] = await Promise.all([
    getPensionSettings(),
    getRoomOccupancy(checkIn, checkOut, {
      kinds: ["request", "stay"],
      excludeBookingId: excludeBookingId || undefined,
      tenantId,
    }),
    listAllRoomsForTenant(tenantId),
  ]);
  if (!settings) return UNLIMITED_INVENTORY;

  const bookingIds = [
    ...new Set(segments.map((s) => s.bookingId).filter((id): id is string => Boolean(id))),
  ];
  const stays: OverlappingStay[] = [];
  if (bookingIds.length > 0) {
    const { data, error } = await createPublicAdminClient()
      .from("bookings")
      .select("id, num_adults, num_children, children_ages, children_separate_room")
      .eq("tenant_id", tenantId)
      .in("id", bookingIds);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      stays.push({
        bookingId: row.id as string,
        party: partyFromBooking(row as Parameters<typeof partyFromBooking>[0]),
        segments: segments
          .filter((s) => s.bookingId === row.id)
          .map((s) => ({ roomId: s.roomId, checkIn: s.checkIn, checkOut: s.checkOut })),
      });
    }
  }

  const used = inventoryInUse({
    checkIn,
    checkOut,
    stays,
    rooms: new Map<string, RoomCapacity>(rooms.map((room) => [room.id, room])),
    policy,
  });
  return remainingInventory(
    { extraBeds: settings.total_extra_beds_max, cots: settings.total_cots_max },
    used,
  );
});

/**
 * Extra beds and baby cots the property still has free on every night of
 * the stay, after the other requests and stays (optionally without one booking).
 */
export async function getFreeStockForStay(input: {
  checkIn: string;
  checkOut: string;
  policy: ChildPolicy;
  excludeBookingId?: string;
}): Promise<SharedInventory> {
  return loadFreeStock(
    input.checkIn,
    input.checkOut,
    input.excludeBookingId ?? "",
    JSON.stringify(input.policy),
  );
}
