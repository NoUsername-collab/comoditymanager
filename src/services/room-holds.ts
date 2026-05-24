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
  if (!isAtLeastOneNight(input.checkIn, input.checkOut)) {
    throw new Error("Interval invalid — minim o noapte.");
  }

  await assertRoomsAvailableForOccupancy(
    input.checkIn,
    input.checkOut,
    [input.roomId]
  );

  const expiresAt =
    input.expiresHours != null && input.expiresHours > 0
      ? new Date(Date.now() + input.expiresHours * 60 * 60 * 1000).toISOString()
      : null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("room_holds")
    .insert({
      room_id: input.roomId,
      check_in: input.checkIn,
      check_out: input.checkOut,
      reason: input.reason?.trim() || null,
      expires_at: expiresAt,
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function releaseRoomHold(holdId: string, releasedBy?: string | null): Promise<void> {
  const supabase = createAdminClient();
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
