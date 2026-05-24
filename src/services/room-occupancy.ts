import { findOccupancyConflicts, hasOccupancyConflict } from "@/domain/occupancy/conflict";
import { occupancyPhase } from "@/domain/occupancy/phase";
import type {
  OccupancyKind,
  OccupancyQueryOptions,
  OccupancySegment,
} from "@/domain/occupancy/types";
import type { BookingStatus } from "@/domain/booking/types";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPensionSettings } from "@/services/pension-settings";
import { releaseExpiredRoomHolds } from "@/services/room-holds";
import { todayIso } from "@/lib/stay-dates";

const ALL_KINDS: OccupancyKind[] = ["hold", "request", "stay", "block"];

function bookingStatusToKind(status: BookingStatus): OccupancyKind {
  return status === "confirmata" ? "stay" : "request";
}

function isHoldActive(row: {
  released_at: string | null;
  expires_at: string | null;
}): boolean {
  if (row.released_at) return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

/**
 * API unificat occupancy — Gantt, disponibilitate, conflicte.
 * Spec: docs/timeline-spec.md
 */
export async function getRoomOccupancy(
  rangeStart: string,
  rangeEnd: string,
  options: OccupancyQueryOptions = {}
): Promise<OccupancySegment[]> {
  const kinds = options.kinds ?? ALL_KINDS;
  const ref = options.referenceDate ?? todayIso();
  const supabase = createAdminClient();
  const out: OccupancySegment[] = [];

  if (kinds.includes("request") || kinds.includes("stay")) {
    let q = supabase
      .from("booking_room_segments")
      .select(
        `
        id, room_id, segment_start, segment_end,
        bookings!inner (
          id, status, guest_name, guest_email
        )
      `
      )
      .lte("segment_start", rangeEnd)
      .gte("segment_end", rangeStart)
      .neq("bookings.status", "anulata");

    if (options.excludeBookingId) {
      q = q.neq("booking_id", options.excludeBookingId);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      const raw = row.bookings as
        | {
            id: string;
            status: string;
            guest_name: string;
            guest_email: string;
          }
        | {
            id: string;
            status: string;
            guest_name: string;
            guest_email: string;
          }[]
        | null;
      const b = Array.isArray(raw) ? raw[0] : raw;
      if (!b) continue;

      const status = b.status as BookingStatus;
      const kind = bookingStatusToKind(status);
      if (!kinds.includes(kind)) continue;

      const checkIn = row.segment_start as string;
      const checkOut = row.segment_end as string;

      out.push({
        id: row.id as string,
        kind,
        roomId: row.room_id as string,
        checkIn,
        checkOut,
        phase: occupancyPhase(checkIn, checkOut, ref),
        bookingId: b.id,
        bookingStatus: status,
        guestName: b.guest_name,
        guestEmail: b.guest_email,
      });
    }
  }

  if (kinds.includes("hold") && !options.forPublicCalendar) {
    await releaseExpiredRoomHolds().catch(() => {
      /* non-fatal */
    });

    const { data, error } = await supabase
      .from("room_holds")
      .select(
        "id, room_id, check_in, check_out, reason, expires_at, released_at"
      )
      .lte("check_in", rangeEnd)
      .gte("check_out", rangeStart)
      .is("released_at", null);

    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      if (!isHoldActive(row)) continue;
      const checkIn = row.check_in as string;
      const checkOut = row.check_out as string;
      out.push({
        id: row.id as string,
        kind: "hold",
        roomId: row.room_id as string,
        checkIn,
        checkOut,
        phase: occupancyPhase(checkIn, checkOut, ref),
        reason: row.reason as string | null,
        expiresAt: row.expires_at as string | null,
        releasedAt: row.released_at as string | null,
      });
    }
  }

  if (kinds.includes("block")) {
    const { data, error } = await supabase
      .from("room_blocks")
      .select("id, room_id, check_in, check_out, reason")
      .lte("check_in", rangeEnd)
      .gte("check_out", rangeStart);

    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      const checkIn = row.check_in as string;
      const checkOut = row.check_out as string;
      out.push({
        id: row.id as string,
        kind: "block",
        roomId: row.room_id as string,
        checkIn,
        checkOut,
        phase: occupancyPhase(checkIn, checkOut, ref),
        reason: row.reason as string,
      });
    }
  }

  return out.sort((a, b) =>
    a.checkIn === b.checkIn
      ? a.roomId.localeCompare(b.roomId)
      : a.checkIn.localeCompare(b.checkIn)
  );
}

/** Interval larg pentru verificări conflict — exclude opțional un booking. */
export async function listOccupancyForConflictCheck(
  excludeBookingId?: string,
  options?: Pick<OccupancyQueryOptions, "forPublicCalendar">
): Promise<OccupancySegment[]> {
  return getRoomOccupancy("1970-01-01", "2099-12-31", {
    excludeBookingId,
    forPublicCalendar: options?.forPublicCalendar,
  });
}

export async function assertRoomsAvailableForOccupancy(
  checkIn: string,
  checkOut: string,
  roomIds: string[],
  excludeBookingId?: string
): Promise<void> {
  if (!isAtLeastOneNight(checkIn, checkOut)) {
    throw new Error("Sejur invalid.");
  }
  const unique = [...new Set(roomIds.filter(Boolean))];
  if (unique.length === 0) {
    throw new Error("Selectează cel puțin o cameră.");
  }

  const settings = await getPensionSettings().catch(() => null);
  const times = {
    checkIn: settings?.default_check_in_time ?? DEFAULT_CHECK_IN_TIME,
    checkOut: settings?.default_check_out_time ?? DEFAULT_CHECK_OUT_TIME,
  };

  const segments = await listOccupancyForConflictCheck(excludeBookingId);
  if (
    hasOccupancyConflict(unique, checkIn, checkOut, segments, {
      bookingId: excludeBookingId,
    }, times)
  ) {
    throw new Error(
      "Una sau mai multe camere nu mai sunt disponibile. Actualizează datele și alege din nou."
    );
  }
}

/** Compat: format vechi pentru isRoomFreeForStay / countFreeRooms */
export async function listOccupiedRoomRanges(
  excludeBookingId?: string,
  options?: Pick<OccupancyQueryOptions, "forPublicCalendar">
): Promise<{ room_id: string; check_in: string; check_out: string }[]> {
  const segments = await listOccupancyForConflictCheck(
    excludeBookingId,
    options
  );
  return segments.map((s) => ({
    room_id: s.roomId,
    check_in: s.checkIn,
    check_out: s.checkOut,
  }));
}

/** Verifică conflict pentru un singur interval + cameră (drag-create preview viitor). */
export async function checkRoomIntervalFree(
  roomId: string,
  checkIn: string,
  checkOut: string,
  exclude?: { bookingId?: string; holdId?: string; blockId?: string }
): Promise<{ free: boolean; conflicts: OccupancySegment[] }> {
  if (!isAtLeastOneNight(checkIn, checkOut)) {
    return { free: false, conflicts: [] };
  }
  const segments = await getRoomOccupancy(checkIn, checkOut);
  const settings = await getPensionSettings().catch(() => null);
  const times = {
    checkIn: settings?.default_check_in_time ?? DEFAULT_CHECK_IN_TIME,
    checkOut: settings?.default_check_out_time ?? DEFAULT_CHECK_OUT_TIME,
  };
  const conflicts = findOccupancyConflicts(
    [roomId],
    checkIn,
    checkOut,
    segments,
    exclude,
    times
  );
  return { free: conflicts.length === 0, conflicts: conflicts.map((c) => c.segment) };
}
