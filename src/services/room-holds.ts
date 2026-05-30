import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { addDays } from "@/lib/stay-dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRoomsAvailableForOccupancy } from "@/services/room-occupancy";

export type RoomHoldRow = {
  id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  reason: string | null;
  expires_at: string | null;
  released_at: string | null;
};

export async function createRoomHold(input: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
  expiresHours?: number | null;
  createdBy?: string | null;
}): Promise<string> {
  const [id] = await createRoomHolds({
    roomIds: [input.roomId],
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    reason: input.reason,
    expiresHours: input.expiresHours,
    createdBy: input.createdBy,
  });
  return id;
}

export async function createRoomHolds(input: {
  roomIds: string[];
  checkIn: string;
  checkOut: string;
  reason?: string;
  expiresHours?: number | null;
  createdBy?: string | null;
}): Promise<string[]> {
  const roomIds = [...new Set(input.roomIds.filter(Boolean))];
  if (roomIds.length === 0) {
    throw new Error("room_holds.select_at_least_one_room");
  }
  if (!isAtLeastOneNight(input.checkIn, input.checkOut)) {
    throw new Error("room_holds.invalid_interval_min_one_night");
  }

  await assertRoomsAvailableForOccupancy(
    input.checkIn,
    input.checkOut,
    roomIds
  );

  const expiresAt =
    input.expiresHours != null && input.expiresHours > 0
      ? new Date(Date.now() + input.expiresHours * 60 * 60 * 1000).toISOString()
      : null;

  const supabase = await createAdminClient();
  const rows = roomIds.map((room_id) => ({
    room_id,
    check_in: input.checkIn,
    check_out: input.checkOut,
    reason: input.reason?.trim() || null,
    expires_at: expiresAt,
    created_by: input.createdBy ?? null,
  }));

  const { data, error } = await supabase
    .from("room_holds")
    .insert(rows)
    .select("id");

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.id as string);
}

export async function releaseRoomHold(holdId: string, releasedBy?: string | null): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("room_holds")
    .update({
      released_at: new Date().toISOString(),
      released_by: releasedBy ?? null,
    })
    .eq("id", holdId)
    .is("released_at", null);

  if (error) throw new Error(error.message);
}

/** Marchează hold-urile expirate ca eliberate (lazy cleanup la citire occupancy). */
export async function releaseExpiredRoomHolds(asOfIso?: string): Promise<number> {
  const supabase = await createAdminClient();
  // Use end-of-day cutoff to match isHoldActive() in room-occupancy.ts
  const cutoff = asOfIso
    ? new Date(`${asOfIso}T23:59:59.999`).toISOString()
    : new Date().toISOString();
  const releasedAt = asOfIso
    ? new Date(`${asOfIso}T12:00:00.000`).toISOString()
    : new Date().toISOString();
  const { data, error } = await supabase
    .from("room_holds")
    .update({
      released_at: releasedAt,
      released_by: "system:expired",
    })
    .is("released_at", null)
    .not("expires_at", "is", null)
    .lt("expires_at", cutoff)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
