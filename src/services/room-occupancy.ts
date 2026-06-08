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
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { getTenantPublicScope, getTenantScope } from "@/lib/tenant/scope";
import { getPensionSettings } from "@/services/pension-settings";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import { releaseExpiredRoomHolds } from "@/services/room-holds";

const ALL_KINDS: OccupancyKind[] = ["hold", "request", "stay", "block"];

function bookingStatusToKind(status: BookingStatus): OccupancyKind {
  return status === "confirmata" ? "stay" : "request";
}

function isHoldActive(
  row: {
    released_at: string | null;
    expires_at: string | null;
  },
  asOfIso: string
): boolean {
  if (row.released_at) return false;
  if (!row.expires_at) return true;
  const asOfMs = new Date(`${asOfIso}T23:59:59.999`).getTime();
  return new Date(row.expires_at).getTime() > asOfMs;
}

async function getRoomOccupancyImpl(
  rangeStart: string,
  rangeEnd: string,
  options: OccupancyQueryOptions = {}
): Promise<OccupancySegment[]> {
  const kinds = options.kinds ?? ALL_KINDS;
  const ref = options.referenceDate ?? (await getEffectiveToday());
  const roomIds = [...new Set((options.roomIds ?? []).filter(Boolean))];
  const { tenantId, supabase } = options.forPublicCalendar
    ? await getTenantPublicScope()
    : await getTenantScope();
  const fetchSegments = async (): Promise<OccupancySegment[]> => {
    if (!kinds.includes("request") && !kinds.includes("stay")) return [];

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
      .eq("tenant_id", tenantId)
      .lte("segment_start", rangeEnd)
      .gte("segment_end", rangeStart)
      .neq("bookings.status", "anulata");

    if (roomIds.length > 0) q = q.in("room_id", roomIds);
    if (options.excludeBookingId) q = q.neq("booking_id", options.excludeBookingId);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const segments: OccupancySegment[] = [];
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
      segments.push({
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
    return segments;
  };

  const fetchHolds = async (): Promise<OccupancySegment[]> => {
    if (!kinds.includes("hold") || options.forPublicCalendar) return [];

    await releaseExpiredRoomHolds(ref).catch(() => {
      /* non-fatal */
    });

    let holdQ = supabase
      .from("room_holds")
      .select(
        "id, room_id, check_in, check_out, reason, expires_at, released_at"
      )
      .eq("tenant_id", tenantId)
      .lte("check_in", rangeEnd)
      .gte("check_out", rangeStart)
      .is("released_at", null);

    if (roomIds.length > 0) holdQ = holdQ.in("room_id", roomIds);

    const { data, error } = await holdQ;
    if (error) throw new Error(error.message);

    const holds: OccupancySegment[] = [];
    for (const row of data ?? []) {
      if (!isHoldActive(row, ref)) continue;
      const checkIn = row.check_in as string;
      const checkOut = row.check_out as string;
      holds.push({
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
    return holds;
  };

  const fetchBlocks = async (): Promise<OccupancySegment[]> => {
    if (!kinds.includes("block")) return [];

    let blockQ = supabase
      .from("room_blocks")
      .select("id, room_id, check_in, check_out, reason")
      .eq("tenant_id", tenantId)
      .lte("check_in", rangeEnd)
      .gte("check_out", rangeStart);

    if (roomIds.length > 0) blockQ = blockQ.in("room_id", roomIds);

    const { data, error } = await blockQ;
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const checkIn = row.check_in as string;
      const checkOut = row.check_out as string;
      return {
        id: row.id as string,
        kind: "block" as const,
        roomId: row.room_id as string,
        checkIn,
        checkOut,
        phase: occupancyPhase(checkIn, checkOut, ref),
        reason: row.reason as string,
      };
    });
  };

  const [segmentRows, holdRows, blockRows] = await Promise.all([
    fetchSegments(),
    fetchHolds(),
    fetchBlocks(),
  ]);

  const out = [...segmentRows, ...holdRows, ...blockRows];

  return out.sort((a, b) =>
    a.checkIn === b.checkIn
      ? a.roomId.localeCompare(b.roomId)
      : a.checkIn.localeCompare(b.checkIn)
  );
}

function occupancyCacheKey(
  tenantId: string,
  rangeStart: string,
  rangeEnd: string,
  options: OccupancyQueryOptions,
  referenceDate: string
): string[] {
  const kinds = (options.kinds ?? ALL_KINDS).slice().sort().join(",");
  const roomIds = [...new Set((options.roomIds ?? []).filter(Boolean))].sort().join(",");
  return [
    "room-occupancy",
    tenantId,
    rangeStart,
    rangeEnd,
    kinds,
    roomIds,
    options.excludeBookingId ?? "",
    options.forPublicCalendar ? "public" : "staff",
    referenceDate,
  ];
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
  if (options.excludeBookingId) {
    return getRoomOccupancyImpl(rangeStart, rangeEnd, options);
  }

  const ref = options.referenceDate ?? (await getEffectiveToday());
  const { tenantId } = options.forPublicCalendar
    ? await getTenantPublicScope()
    : await getTenantScope();

  const cached = unstable_cache(
    () => getRoomOccupancyImpl(rangeStart, rangeEnd, { ...options, referenceDate: ref }),
    occupancyCacheKey(tenantId, rangeStart, rangeEnd, options, ref),
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 30,
    }
  );

  return cached();
}

/** Interval larg pentru verificări conflict — exclude opțional un booking. */
export async function listOccupancyForConflictCheck(
  excludeBookingId?: string,
  options?: Pick<OccupancyQueryOptions, "forPublicCalendar" | "roomIds"> & {
    rangeStart?: string;
    rangeEnd?: string;
  }
): Promise<OccupancySegment[]> {
  return getRoomOccupancy(
    options?.rangeStart ?? "1970-01-01",
    options?.rangeEnd ?? "2099-12-31",
    {
    excludeBookingId,
    roomIds: options?.roomIds,
    forPublicCalendar: options?.forPublicCalendar,
    }
  );
}

export async function assertRoomsAvailableForOccupancy(
  checkIn: string,
  checkOut: string,
  roomIds: string[],
  excludeBookingId?: string
): Promise<void> {
  if (!isAtLeastOneNight(checkIn, checkOut)) {
    throw new Error("occupancy.invalid_stay");
  }
  const unique = [...new Set(roomIds.filter(Boolean))];
  if (unique.length === 0) {
    throw new Error("occupancy.select_at_least_one_room");
  }

  const settings = await getPensionSettings().catch(() => null);
  const times = {
    checkIn: settings?.default_check_in_time ?? DEFAULT_CHECK_IN_TIME,
    checkOut: settings?.default_check_out_time ?? DEFAULT_CHECK_OUT_TIME,
  };

  const segments = await listOccupancyForConflictCheck(excludeBookingId, {
    rangeStart: checkIn,
    rangeEnd: checkOut,
    roomIds: unique,
    forPublicCalendar: true,
  });
  if (
    hasOccupancyConflict(unique, checkIn, checkOut, segments, {
      bookingId: excludeBookingId,
    }, times)
  ) {
    throw new Error("occupancy.one_or_more_rooms_unavailable_refresh_and_retry");
  }
}

/** Compat: format vechi pentru isRoomFreeForStay / countFreeRooms */
export async function listOccupiedRoomRanges(
  excludeBookingId?: string,
  options?: Pick<OccupancyQueryOptions, "forPublicCalendar" | "roomIds"> & {
    rangeStart?: string;
    rangeEnd?: string;
  }
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
  const segments = await getRoomOccupancy(checkIn, checkOut, { roomIds: [roomId] });
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
