"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { computeStandardStayTotal } from "@/domain/pricing/confirm-stay-total";
import { requireAdmin, getAdminUser } from "@/lib/auth/require-admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  confirmBookingWithRooms,
  createBookingRequest,
  adjustBookingStayNights,
  duplicateBookingAsCerere,
  shiftBookingByDays,
} from "@/services/bookings";
import { createRoomBlock, deleteRoomBlock } from "@/services/room-blocks";
import { createRoomHold, createRoomHolds, releaseRoomHold } from "@/services/room-holds";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  moveBookingRoomFromPivot,
  previewRoomMoveFromPivot,
} from "@/services/booking-segments";
import { assertValidGuestPhone } from "@/domain/guest/normalize";
import { assertRoomsAvailableForOccupancy } from "@/services/room-occupancy";
import { getTranslations } from "next-intl/server";

const getT = () => getTranslations("admin.serverActions");

type ActionOk = { ok: true; id: string; undo?: { kind: "hold" | "block"; id: string } };
type ActionErr = { ok: false; error: string };

function actorEmail(user: { email?: string | null } | null): string | null {
  return user?.email ?? null;
}

export async function createRoomHoldsFromGanttAction(input: {
  roomIds: string[];
  checkIn: string;
  checkOut: string;
  reason?: string;
  expiresHours?: number | null;
}): Promise<
  { ok: true; ids: string[]; undo?: { kind: "hold"; ids: string[] } } | ActionErr
> {
  const t = await getT();
  await requireAdmin();
  try {
    const user = await getAdminUser();
    const ids = await createRoomHolds({
      roomIds: input.roomIds,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      reason: input.reason,
      expiresHours: input.expiresHours,
      createdBy: actorEmail(user),
    });
    revalidatePath("/admin/calendar");
    return { ok: true, ids, undo: { kind: "hold", ids } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("holdError"),
    };
  }
}

export async function createRoomHoldFromGanttAction(input: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
  expiresHours?: number | null;
}): Promise<ActionOk | ActionErr> {
  const t = await getT();
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
      error: e instanceof Error ? e.message : t("holdError"),
    };
  }
}

export async function createRoomBlockFromGanttAction(input: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  reason: string;
}): Promise<ActionOk | ActionErr> {
  const t = await getT();
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
      error: e instanceof Error ? e.message : t("blockError"),
    };
  }
}

export async function releaseRoomHoldAction(
  holdId: string
): Promise<{ ok: true } | ActionErr> {
  const t = await getT();
  await requireAdmin();
  try {
    const user = await getAdminUser();
    await releaseRoomHold(holdId, actorEmail(user));
    revalidatePath("/admin/calendar");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("releaseHoldError"),
    };
  }
}

export async function deleteRoomBlockAction(
  blockId: string
): Promise<{ ok: true } | ActionErr> {
  const t = await getT();
  await requireAdmin();
  try {
    await deleteRoomBlock(blockId);
    revalidatePath("/admin/calendar");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("deleteBlockError"),
    };
  }
}

export async function undoGanttCreateAction(input: {
  kind: "hold" | "block";
  id?: string;
  ids?: string[];
}): Promise<{ ok: true } | ActionErr> {
  const t = await getT();
  await requireAdmin();
  try {
    const user = await getAdminUser();
    if (input.kind === "hold") {
      const holdIds = input.ids ?? (input.id ? [input.id] : []);
      for (const holdId of holdIds) {
        await releaseRoomHold(holdId, actorEmail(user));
      }
    } else {
      const blockId = input.id;
      if (!blockId) throw new Error(t("blockIdMissing"));
      await deleteRoomBlock(blockId);
    }
    revalidatePath("/admin/calendar");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("undoError"),
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
  const t = await getT();
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
    if (!last || !first || !email || !input.guestPhone?.trim()) {
      return { ok: false, error: t("nameEmailPhoneRequired") };
    }
    try {
      assertValidGuestPhone(input.guestPhone);
    } catch {
      return { ok: false, error: t("invalidPhone") };
    }

    const id = await createBookingRequest({
      check_in: input.checkIn,
      check_out: input.checkOut,
      guest_name: `${last} ${first}`.trim(),
      guest_last_name: last,
      guest_first_name: first,
      guest_email: email,
      guest_phone: input.guestPhone.trim(),
      num_adults: 1,
      num_children: 0,
      has_minor: false,
      minor_age: "",
      notes: t("createdFromGanttNote"),
      room_ids: [input.roomId],
    });
    revalidateTag(CACHE_TAGS.bookingCounts, "max");
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/bookings");
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("requestError"),
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
  const t = await getT();
  await requireAdmin();
  try {
    const last = input.guestLastName.trim();
    const first = input.guestFirstName.trim();
    const email = input.guestEmail.trim();
    if (!last || !first || !email || !input.guestPhone?.trim()) {
      return { ok: false, error: t("nameEmailPhoneRequired") };
    }
    try {
      assertValidGuestPhone(input.guestPhone);
    } catch {
      return { ok: false, error: t("invalidPhone") };
    }

    const bookingId = await createBookingRequest({
      check_in: input.checkIn,
      check_out: input.checkOut,
      guest_name: `${last} ${first}`.trim(),
      guest_last_name: last,
      guest_first_name: first,
      guest_email: email,
      guest_phone: input.guestPhone.trim(),
      num_adults: 1,
      num_children: 0,
      has_minor: false,
      minor_age: "",
      notes: t("directStayFromGanttNote"),
      room_ids: [input.roomId],
    });

    const supabase = await createAdminClient();
    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .select("price_per_night")
      .eq("id", input.roomId)
      .maybeSingle();
    if (roomErr) throw new Error(roomErr.message);
    if (!room) throw new Error(t("roomNotFound"));

    const total = computeStandardStayTotal(
      [{ price_per_night: Number(room.price_per_night) }],
      input.checkIn,
      input.checkOut
    );

    await confirmBookingWithRooms(bookingId, [input.roomId], total);

    revalidateTag(CACHE_TAGS.bookingCounts, "max");
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/cazari");
    return { ok: true, id: bookingId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("directStayError"),
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
  const t = await getT();
  await requireAdmin();
  try {
    if (!Number.isInteger(dayDelta) || Math.abs(dayDelta) > 366) {
      return { ok: false, error: t("invalidMove") };
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
      error: e instanceof Error ? e.message : t("moveError"),
    };
  }
}

export async function previewRoomMoveAction(input: {
  bookingId: string;
  sourceRoomId: string;
  targetRoomId: string;
  pivotDate?: string;
}): Promise<
  | { ok: true; preview: Awaited<ReturnType<typeof previewRoomMoveFromPivot>> }
  | ActionErr
> {
  const t = await getT();
  await requireAdmin();
  try {
    const preview = await previewRoomMoveFromPivot(input);
    return { ok: true, preview };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("previewError"),
    };
  }
}

export async function moveBookingRoomFromPivotAction(input: {
  bookingId: string;
  sourceRoomId: string;
  targetRoomId: string;
  pivotDate?: string;
}): Promise<{ ok: true } | ActionErr> {
  const t = await getT();
  await requireAdmin();
  try {
    await moveBookingRoomFromPivot(input);
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${input.bookingId}`);
    revalidatePath("/admin/cazari");
    revalidatePath("/admin/statistics");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("moveRoomError"),
    };
  }
}

export async function adjustBookingStayNightsAction(
  bookingId: string,
  nightDelta: number
): Promise<{ ok: true; check_in: string; check_out: string } | ActionErr> {
  const t = await getT();
  await requireAdmin();
  try {
    if (!Number.isInteger(nightDelta) || Math.abs(nightDelta) !== 1) {
      return { ok: false, error: t("invalidAdjustment") };
    }
    const result = await adjustBookingStayNights(bookingId, nightDelta);
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
      error: e instanceof Error ? e.message : t("stayAdjustmentError"),
    };
  }
}

export async function duplicateBookingAsCerereAction(
  bookingId: string
): Promise<{ ok: true; id: string } | ActionErr> {
  const t = await getT();
  await requireAdmin();
  try {
    const id = await duplicateBookingAsCerere(bookingId);
    revalidateTag(CACHE_TAGS.bookingCounts, "max");
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/cereri");
    revalidatePath("/admin/statistics");
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("duplicateError"),
    };
  }
}
