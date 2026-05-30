import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRoomsAvailableForOccupancy } from "@/services/room-occupancy";

export async function createRoomBlock(input: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  reason: string;
  createdBy?: string | null;
}): Promise<string> {
  const reason = input.reason.trim();
  if (!reason) throw new Error("room_blocks.reason_required");
  if (!isAtLeastOneNight(input.checkIn, input.checkOut)) {
    throw new Error("room_blocks.invalid_interval_min_one_night");
  }

  await assertRoomsAvailableForOccupancy(
    input.checkIn,
    input.checkOut,
    [input.roomId]
  );

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("room_blocks")
    .insert({
      room_id: input.roomId,
      check_in: input.checkIn,
      check_out: input.checkOut,
      reason,
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteRoomBlock(blockId: string): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("room_blocks").delete().eq("id", blockId);
  if (error) throw new Error(error.message);
}
