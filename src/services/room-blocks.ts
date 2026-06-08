import { isAtLeastOneNight } from "@/domain/booking/conflict";
import {
  getTenantScope,
  withTenantId,
} from "@/lib/tenant/scope";
import { addDays } from "@/lib/stay-dates";
import { assertRoomsAvailableForOccupancy } from "@/services/room-occupancy";

async function requireRoomInTenant(roomId: string) {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("rooms")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("rooms.not_found");
  return { tenantId, supabase };
}

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

  const { tenantId, supabase } = await requireRoomInTenant(input.roomId);
  const { data, error } = await supabase
    .from("room_blocks")
    .insert(
      withTenantId(tenantId, {
        room_id: input.roomId,
        check_in: input.checkIn,
        check_out: input.checkOut,
        reason,
        created_by: input.createdBy ?? null,
      })
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteRoomBlock(blockId: string): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("room_blocks")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", blockId);
  if (error) throw new Error(error.message);
}

export async function extendRoomBlockOneNight(blockId: string): Promise<string> {
  const { tenantId, supabase } = await getTenantScope();
  const { data: block, error: fetchErr } = await supabase
    .from("room_blocks")
    .select("id, room_id, check_in, check_out")
    .eq("tenant_id", tenantId)
    .eq("id", blockId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!block) throw new Error("room_blocks.not_found");

  const newCheckOut = addDays(block.check_out as string, 1);
  await assertRoomsAvailableForOccupancy(
    block.check_out as string,
    newCheckOut,
    [block.room_id as string]
  );

  const { error } = await supabase
    .from("room_blocks")
    .update({ check_out: newCheckOut })
    .eq("tenant_id", tenantId)
    .eq("id", blockId);

  if (error) throw new Error(error.message);
  return newCheckOut;
}
