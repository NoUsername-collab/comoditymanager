"use server";

import { revalidatePath } from "next/cache";
import { computeStandardStayTotal } from "@/domain/pricing/confirm-stay-total";
import { requireAdmin, getAdminUser } from "@/lib/auth/require-admin";
import {
  confirmBookingWithRooms,
  createBookingRequest,
  shiftBookingByDays,
} from "@/services/bookings";
import { createRoomBlock, deleteRoomBlock } from "@/services/room-blocks";
import { createRoomHold, releaseRoomHold } from "@/services/room-holds";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRoomsAvailableForOccupancy } from "@/services/room-occupancy";

type ActionOk = { ok: true; id: string; undo?: { kind: "hold" | "block"; id: string } };
type ActionErr = { ok: false; error: string };

function actorEmail(user: { email?: string | null } | null): string | null {
  return user?.email ?? null;
}

export async function createRoomHoldFromGanttAction(input: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
  expiresHours?: number | null;
}): Promise<ActionOk | ActionErr> {
  await requireAdmin();
  try {
    const user = await getAdminUser();
    const id = await createRoomHold({
      roomId: input.roomId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      reason: input.reason,
      expiresHours: input.expiresHours,
      createdBy: actorEmail(user),
    });
    revalidatePath("/admin/calendar");
    return { ok: true, id, undo: { kind: "hold", id } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Eroare la hold",
    };
  }
}

export async function createRoomBlockFromGanttAction(input: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  reason: string;
}): Promise<ActionOk | ActionErr> {
  await requireAdmin();
  try {
    const user = await getAdminUser();
    const id = await createRoomBlock({
      roomId: input.roomId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      reason: input.reason,
      createdBy: actorEmail(user),
    });
    revalidatePath("/admin/calendar");
    return { ok: true, id, undo: { kind: "block", id } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Eroare la blocare",
    };
  }
}

export async function undoGanttCreateAction(input: {
  kind: "hold" | "block";
  id: string;
}): Promise<{ ok: true } | ActionErr> {
  await requireAdmin();
  try {
    const user = await getAdminUser();
    if (input.kind === "hold") {
      await releaseRoomHold(input.id, actorEmail(user));
    } else {
      await deleteRoomBlock(input.id);
    }
    revalidatePath("/admin/calendar");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Eroare undo",
    };
  }
}

export async function createCerereFromGanttAction(input: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestLastName: string;
  guestFirstName: string;
  guestEmail: string;
  guestPhone?: string;
}): Promise<ActionOk | ActionErr> {
  await requireAdmin();
  try {
    await assertRoomsAvailableForOccupancy(
      input.checkIn,
      input.checkOut,
      [input.roomId]
    );
    const last = input.guestLastName.trim();
    const first = input.guestFirstName.trim();
    const email = input.guestEmail.trim();
    if (!last || !first || !email) {
      return { ok: false, error: "Nume și email sunt obligatorii." };
    }

    const id = await createBookingRequest({
      check_in: input.checkIn,
      check_out: input.checkOut,
      guest_name: `${last} ${first}`.trim(),
      guest_last_name: last,
      guest_first_name: first,
      guest_email: email,
      guest_phone: input.guestPhone?.trim() || "—",
      num_adults: 1,
      num_children: 0,
      has_minor: false,
      minor_age: "",
      notes: "Creat din Gantt",
      room_ids: [input.roomId],
    });
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/bookings");
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Eroare la cerere",
    };
  }
}

export async function createDirectStayFromGanttAction(input: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestLastName: string;
  guestFirstName: string;
  guestEmail: string;
  guestPhone?: string;
}): Promise<ActionOk | ActionErr> {
  await requireAdmin();
  try {
    const last = input.guestLastName.trim();
    const first = input.guestFirstName.trim();
    const email = input.guestEmail.trim();
    if (!last || !first || !email) {
      return { ok: false, error: "Nume și email sunt obligatorii." };
    }

    const bookingId = await createBookingRequest({
      check_in: input.checkIn,
      check_out: input.checkOut,
      guest_name: `${last} ${first}`.trim(),
      guest_last_name: last,
      guest_first_name: first,
      guest_email: email,
      guest_phone: input.guestPhone?.trim() || "—",
      num_adults: 1,
      num_children: 0,
      has_minor: false,
      minor_age: "",
      notes: "Cazare directă din Gantt",
      room_ids: [input.roomId],
    });

    const supabase = createAdminClient();
    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .select("price_per_night")
      .eq("id", input.roomId)
      .maybeSingle();
    if (roomErr) throw new Error(roomErr.message);
    if (!room) throw new Error("Camera nu există.");

    const total = computeStandardStayTotal(
      [{ price_per_night: Number(room.price_per_night) }],
      input.checkIn,
      input.checkOut
    );

    await confirmBookingWithRooms(bookingId, [input.roomId], total);

    revalidatePath("/admin/calendar");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/cazari");
    return { ok: true, id: bookingId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Eroare la cazare directă",
    };
  }
}

export async function checkGanttIntervalAction(input: {
  roomId: string;
  checkIn: string;
  checkOut: string;
}): Promise<{ ok: true; free: boolean } | ActionErr> {
  await requireAdmin();
  try {
    await assertRoomsAvailableForOccupancy(
      input.checkIn,
      input.checkOut,
      [input.roomId]
    );
    return { ok: true, free: true };
  } catch {
    return { ok: true, free: false };
  }
}

export async function shiftBookingOnGanttAction(
  bookingId: string,
  dayDelta: number
): Promise<{ ok: true; check_in: string; check_out: string } | ActionErr> {
  await requireAdmin();
  try {
    if (!Number.isInteger(dayDelta) || Math.abs(dayDelta) > 366) {
      return { ok: false, error: "Mutare invalidă." };
    }
    const result = await shiftBookingByDays(bookingId, dayDelta);
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/cazari");
    revalidatePath("/admin/istoric");
    revalidatePath("/admin/statistics");
    revalidatePath(`/admin/bookings/${bookingId}`);
    return { ok: true, ...result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Eroare la mutare",
    };
  }
}
