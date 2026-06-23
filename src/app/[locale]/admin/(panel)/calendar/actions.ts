"use server";

import { after } from "next/server";
import { computeStandardStayTotal } from "@/domain/pricing/confirm-stay-total";
import { requireAnyStaff, requireStaffPermission, getStaffUser } from "@/lib/auth/require-admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import {
  revalidateAdminCalendar,
  revalidateBookingSurfaces,
  revalidateBookingSurfacesExtended,
} from "@/lib/cache/revalidate-admin";
import {
  confirmBookingWithRooms,
  createBookingRequest,
  getBookingById,
  adjustBookingStayNights,
  duplicateBookingAsCerere,
  shiftBookingByDays,
} from "@/services/bookings";
import { resolveTotalPriceForConfirm } from "@/services/booking-confirm";
import { createRoomBlock, deleteRoomBlock, extendRoomBlockOneNight } from "@/services/room-blocks";
import {
  createRoomHold,
  createRoomHolds,
  extendRoomHoldOneNight,
  releaseRoomHold,
} from "@/services/room-holds";
import { getRoomById } from "@/services/rooms-admin";
import {
  moveBookingRoomFromPivot,
  previewRoomMoveFromPivot,
} from "@/services/booking-segments";
import { assertValidGuestPhone } from "@/domain/guest/normalize";
import { assertRoomsAvailableForOccupancy } from "@/services/room-occupancy";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { getTranslations } from "next-intl/server";
import { createServerTimer } from "@/lib/dev/server-timing";
import { buildSyntheticGanttBookingRow } from "@/services/bookings/synthetic-gantt-row";
import type { BookingRow } from "@/services/bookings/types";

const getT = () => getTranslations("admin.serverActions");

type ActionOk = {
  ok: true;
  id: string;
  booking?: BookingRow;
  undo?: { kind: "hold" | "block"; id: string; logId?: string };
};
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
  | { ok: true; ids: string[]; undo?: { kind: "hold"; ids: string[]; logId?: string } }
  | ActionErr
> {
  const t = await getT();
  await requireAnyStaff();
  try {
    const user = await getStaffUser();
    const ids = await createRoomHolds({
      roomIds: input.roomIds,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      reason: input.reason,
      expiresHours: input.expiresHours,
      createdBy: actorEmail(user),
    });
    revalidateAdminCalendar();
    const logId = await logAdminActivityFromSession({
      action: "occupancy.hold_created",
      entityType: "room",
      entityId: input.roomIds[0] ?? null,
      summary: `Hold ${input.roomIds.length} camere · ${input.checkIn} → ${input.checkOut}`,
      undoable: true,
      metadata: {
        hold_ids: ids,
        check_in: input.checkIn,
        check_out: input.checkOut,
      },
    });
    return { ok: true, ids, undo: { kind: "hold", ids, logId: logId ?? undefined } };
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
  await requireAnyStaff();
  try {
    const user = await getStaffUser();
    const id = await createRoomHold({
      roomId: input.roomId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      reason: input.reason,
      expiresHours: input.expiresHours,
      createdBy: actorEmail(user),
    });
    revalidateAdminCalendar();
    const logId = await logAdminActivityFromSession({
      action: "occupancy.hold_created",
      entityType: "room",
      entityId: input.roomId,
      summary: `Hold cameră · ${input.checkIn} → ${input.checkOut}`,
      undoable: true,
      metadata: {
        hold_id: id,
        hold_ids: [id],
        check_in: input.checkIn,
        check_out: input.checkOut,
      },
    });
    return { ok: true, id, undo: { kind: "hold", id, logId: logId ?? undefined } };
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
  await requireAnyStaff();
  try {
    const user = await getStaffUser();
    const id = await createRoomBlock({
      roomId: input.roomId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      reason: input.reason,
      createdBy: actorEmail(user),
    });
    revalidateAdminCalendar();
    const logId = await logAdminActivityFromSession({
      action: "occupancy.block_created",
      entityType: "room",
      entityId: input.roomId,
      summary: `Blocare · ${input.checkIn} → ${input.checkOut}`,
      undoable: true,
      metadata: {
        block_id: id,
        check_in: input.checkIn,
        check_out: input.checkOut,
        reason: input.reason,
      },
    });
    return { ok: true, id, undo: { kind: "block", id, logId: logId ?? undefined } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("blockError"),
    };
  }
}

export async function quickConfirmCerereFromGanttAction(
  bookingId: string
): Promise<{ ok: true } | ActionErr> {
  const t = await getT();
  await requireStaffPermission("booking_management");
  try {
    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, error: t("bookingNotFound") };
    if (booking.status !== "cerere_noua") {
      return { ok: false, error: t("onlyNewRequests") };
    }
    const roomIds = booking.room_ids ?? [];
    if (roomIds.length === 0) {
      return { ok: false, error: t("assignRoomsBeforeConfirm") };
    }
    const total = await resolveTotalPriceForConfirm(
      bookingId,
      roomIds,
      new FormData()
    );
    await confirmBookingWithRooms(bookingId, roomIds, total);
    revalidateBookingSurfacesExtended({ bookingId, includeHistoric: true });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("confirmError"),
    };
  }
}

export async function extendRoomHoldAction(
  holdId: string
): Promise<{ ok: true; check_out: string } | ActionErr> {
  const t = await getT();
  await requireAnyStaff();
  try {
    const check_out = await extendRoomHoldOneNight(holdId);
    revalidateAdminCalendar();
    return { ok: true, check_out };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("extendHoldError"),
    };
  }
}

export async function extendRoomBlockAction(
  blockId: string
): Promise<{ ok: true; check_out: string } | ActionErr> {
  const t = await getT();
  await requireAnyStaff();
  try {
    const check_out = await extendRoomBlockOneNight(blockId);
    revalidateAdminCalendar();
    return { ok: true, check_out };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("extendBlockError"),
    };
  }
}

export async function releaseRoomHoldAction(
  holdId: string
): Promise<{ ok: true } | ActionErr> {
  const t = await getT();
  await requireAnyStaff();
  try {
    const user = await getStaffUser();
    await releaseRoomHold(holdId, actorEmail(user));
    revalidateAdminCalendar();
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
  await requireAnyStaff();
  try {
    await deleteRoomBlock(blockId);
    revalidateAdminCalendar();
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
  await requireAnyStaff();
  try {
    const user = await getStaffUser();
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
    revalidateAdminCalendar();
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
  roomName?: string;
  checkIn: string;
  checkOut: string;
  guestLastName: string;
  guestFirstName: string;
  guestEmail: string;
  guestPhone?: string;
  /** UI a verificat deja conflictul pe interval — evită al 2-lea query ocupare. */
  skipAvailabilityCheck?: boolean;
}): Promise<ActionOk | ActionErr> {
  const t = await getT();
  const timer = createServerTimer("createCerereFromGantt");
  await requireAnyStaff();
  timer.mark("auth");
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
      skipAvailabilityCheck: input.skipAvailabilityCheck === true,
    });
    timer.mark("createBookingRequest");

    after(async () => {
      const tenantId = await resolveTenantIdForData();
      revalidateBookingSurfaces(tenantId);
    });

    const booking = buildSyntheticGanttBookingRow({
      id,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      status: "cerere_noua",
      guestLastName: last,
      guestFirstName: first,
      guestEmail: email,
      guestPhone: input.guestPhone.trim(),
      roomId: input.roomId,
      roomName: input.roomName,
    });
    timer.finish({ bookingId: id });
    return { ok: true, id, booking };
  } catch (e) {
    timer.finish({ error: true });
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("requestError"),
    };
  }
}

export async function createDirectStayFromGanttAction(input: {
  roomId: string;
  roomName?: string;
  checkIn: string;
  checkOut: string;
  guestLastName: string;
  guestFirstName: string;
  guestEmail: string;
  guestPhone?: string;
  skipAvailabilityCheck?: boolean;
}): Promise<ActionOk | ActionErr> {
  const timer = createServerTimer("gantt-create-direct");
  const t = await getT();
  await requireStaffPermission("booking_management");
  timer.mark("auth");
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

    const [bookingId, room] = await Promise.all([
      createBookingRequest({
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
        skipAvailabilityCheck: input.skipAvailabilityCheck === true,
      }),
      getRoomById(input.roomId),
    ]);
    timer.mark("create");

    const total = computeStandardStayTotal(
      [{ price_per_night: Number(room.price_per_night) }],
      input.checkIn,
      input.checkOut,
    );

    await confirmBookingWithRooms(bookingId, [input.roomId], total);
    timer.mark("confirm");

    after(async () => {
      const tenantId = await resolveTenantIdForData();
      revalidateBookingSurfaces(tenantId);
    });

    const booking = buildSyntheticGanttBookingRow({
      id: bookingId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      status: "confirmata",
      guestLastName: last,
      guestFirstName: first,
      guestEmail: email,
      guestPhone: input.guestPhone.trim(),
      roomId: input.roomId,
      roomName: input.roomName ?? room.name,
      totalPrice: total,
    });
    timer.finish({ id: bookingId });
    return { ok: true, id: bookingId, booking };
  } catch (e) {
    timer.finish({ error: true });
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
  await requireAnyStaff();
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
  await requireStaffPermission("booking_management");
  try {
    if (!Number.isInteger(dayDelta) || Math.abs(dayDelta) > 366) {
      return { ok: false, error: t("invalidMove") };
    }
    const result = await shiftBookingByDays(bookingId, dayDelta);
    revalidateBookingSurfacesExtended({
      bookingId,
      includeHistoric: true,
      includeStatistics: true,
    });
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
  await requireStaffPermission("booking_management");
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
  await requireStaffPermission("booking_management");
  try {
    await moveBookingRoomFromPivot(input);
    revalidateBookingSurfacesExtended({
      bookingId: input.bookingId,
      includeStatistics: true,
    });
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
  await requireStaffPermission("booking_management");
  try {
    if (!Number.isInteger(nightDelta) || Math.abs(nightDelta) !== 1) {
      return { ok: false, error: t("invalidAdjustment") };
    }
    const result = await adjustBookingStayNights(bookingId, nightDelta);
    revalidateBookingSurfacesExtended({
      bookingId,
      includeHistoric: true,
      includeStatistics: true,
    });
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
  await requireAnyStaff();
  try {
    const id = await duplicateBookingAsCerere(bookingId);
    revalidateBookingSurfacesExtended({
      includeCereri: true,
      includeStatistics: true,
    });
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("duplicateError"),
    };
  }
}
