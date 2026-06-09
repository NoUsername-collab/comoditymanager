import { cache } from "react";
import { formatGuestFullName } from "@/domain/guest-name";
import {
  shiftStayDatesByYears,
  shiftStayToNextFutureYear,
} from "@/domain/guest/rebook-dates";
import {
  assertValidGuestPhone,
  normalizeEmail,
  normalizePhone,
} from "@/domain/guest/normalize";
import { parseGuestTags } from "@/domain/guest/tags";
import type {
  GuestDocType,
  GuestHighlights,
  GuestBookingInput,
  GuestIdentityStatus,
  GuestListItem,
  GuestNationalIdType,
  GuestRow,
  GuestSearchFilter,
  GuestSearchResult,
  GuestSex,
  GuestStayReviewRow,
  GuestTag,
} from "@/domain/guest/types";
import { GUEST_MATCH_PRIORITY } from "@/domain/guest/matching-contract";
import type { BookingStatus } from "@/domain/booking/types";
import type { BookingRoomSegmentRow } from "@/domain/booking/segment-types";
import { stayNightCount } from "@/lib/stay-dates";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { mapGuestRow } from "@/domain/guest/map-row";
import {
  ensureGuestProfiles,
  getGuestProfile,
  listGuestProfileSummaries,
  listGuestStayReviewsByBookingIds,
  mergeGuestProfiles,
} from "@/services/guest-profiles";


async function listSegmentsForBookings(
  bookingIds: string[]
): Promise<Map<string, BookingRoomSegmentRow[]>> {
  const ids = [...new Set(bookingIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("booking_room_segments")
    .select("id, booking_id, room_id, segment_start, segment_end, nightly_rate")
    .eq("tenant_id", tenantId)
    .in("booking_id", ids)
    .order("segment_start", { ascending: true });

  if (error) throw new Error(error.message);

  const grouped = new Map<string, BookingRoomSegmentRow[]>();
  for (const row of (data ?? []) as BookingRoomSegmentRow[]) {
    const current = grouped.get(row.booking_id) ?? [];
    current.push(row);
    grouped.set(row.booking_id, current);
  }
  return grouped;
}

export type GuestBookingHistoryItem = {
  id: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  room_names: string[];
  total_price: number | null;
  num_adults: number;
  num_children: number;
  segments: BookingRoomSegmentRow[];
  review: GuestStayReviewRow | null;
};

const loadGuestBookingHistory = cache(async (
  guestId: string
): Promise<GuestBookingHistoryItem[]> => {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, check_in, check_out, status, total_price, num_adults, num_children,
      booking_rooms ( room_id, rooms ( name ) )
    `
    )
    .eq("tenant_id", tenantId)
    .eq("guest_id", guestId)
    .order("check_in", { ascending: false });

  if (error) throw new Error(error.message);

  const bookingIds = (data ?? []).map((booking) => String(booking.id));
  const [segmentsByBooking, reviews] = await Promise.all([
    listSegmentsForBookings(bookingIds),
    listGuestStayReviewsByBookingIds(bookingIds),
  ]);
  const items: GuestBookingHistoryItem[] = [];
  for (const b of data ?? []) {
    const br = (b.booking_rooms ?? []) as {
      room_id: string;
      rooms: { name: string } | { name: string }[] | null;
    }[];
    const room_names: string[] = [];
    for (const line of br) {
      const r = line.rooms;
      const name = Array.isArray(r) ? r[0]?.name : r?.name;
      if (name) room_names.push(name);
    }
    items.push({
      id: b.id as string,
      check_in: b.check_in as string,
      check_out: b.check_out as string,
      status: b.status as BookingStatus,
      room_names,
      total_price: b.total_price != null ? Number(b.total_price) : null,
      num_adults: b.num_adults as number,
      num_children: b.num_children as number,
      segments: segmentsByBooking.get(String(b.id)) ?? [],
      review: reviews.get(String(b.id)) ?? null,
    });
  }
  return items;
});

export async function getGuestBookingHistory(
  guestId: string
): Promise<GuestBookingHistoryItem[]> {
  return loadGuestBookingHistory(guestId);
}

