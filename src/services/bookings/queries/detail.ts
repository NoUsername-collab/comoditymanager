import { cache } from "react";
import type { GuestFlagLevel } from "@/domain/guest/types";
import type { BookingStatus } from "@/domain/booking/types";
import { listGuestProfileSummaries } from "@/services/guest-profiles";
import { getTenantScope } from "@/lib/tenant/scope";

import type { BookingDetail } from "../types";

const BOOKING_DETAIL_SELECT = `
  id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
  guest_email, guest_phone, guest_id, guest_alert_level, guest_alert_note,
  num_adults, num_children, has_minor, minor_age, notes, total_price,
  actual_check_in_at, actual_check_out_at, actual_check_in_by, actual_check_out_by,
  booking_rooms ( room_id, rooms ( name ) )
`;

type BookingDetailRow = {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  guest_name: string;
  guest_last_name: string | null;
  guest_first_name: string | null;
  guest_email: string;
  guest_phone: string | null;
  guest_id: string | null;
  guest_alert_level: GuestFlagLevel;
  guest_alert_note: string | null;
  num_adults: number;
  num_children: number;
  has_minor: boolean;
  minor_age: string | null;
  notes: string | null;
  total_price: number | null;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  actual_check_in_by: string | null;
  actual_check_out_by: string | null;
  booking_rooms:
    | {
        room_id: string;
        rooms: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

async function mapBookingDetailFromRow(
  data: BookingDetailRow
): Promise<BookingDetail> {
  const br = data.booking_rooms ?? [];
  const room_ids: string[] = [];
  const room_names: string[] = [];
  for (const line of br) {
    room_ids.push(line.room_id);
    const r = line.rooms;
    const name = Array.isArray(r) ? r[0]?.name : r?.name;
    if (name) room_names.push(name);
  }
  const profiles = await listGuestProfileSummaries(
    data.guest_id ? [String(data.guest_id)] : []
  );

  return {
    id: data.id,
    check_in: data.check_in,
    check_out: data.check_out,
    status: data.status as BookingStatus,
    guest_name: data.guest_name,
    guest_last_name: data.guest_last_name ?? null,
    guest_first_name: data.guest_first_name ?? null,
    guest_email: data.guest_email,
    guest_phone: data.guest_phone,
    guest_id: data.guest_id ?? null,
    guest_alert_level:
      data.guest_alert_level === "watchlist" || data.guest_alert_level === "blacklist"
        ? data.guest_alert_level
        : "normal",
    guest_alert_note: data.guest_alert_note ?? null,
    guest_profile: data.guest_id ? profiles.get(String(data.guest_id)) ?? null : null,
    num_adults: data.num_adults,
    num_children: data.num_children,
    has_minor: data.has_minor,
    minor_age: data.minor_age,
    notes: data.notes,
    total_price: data.total_price != null ? Number(data.total_price) : null,
    actual_check_in_at: data.actual_check_in_at ?? null,
    actual_check_out_at: data.actual_check_out_at ?? null,
    actual_check_in_by: data.actual_check_in_by ?? null,
    actual_check_out_by: data.actual_check_out_by ?? null,
    room_ids,
    room_names,
  };
}

const loadBookingById = cache(async (id: string): Promise<BookingDetail | null> => {
  const { data, error } = await getTenantScope().then(({ tenantId, supabase }) =>
    supabase
      .from("bookings")
      .select(BOOKING_DETAIL_SELECT)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()
  );

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapBookingDetailFromRow(data as BookingDetailRow);
});

export async function getBookingById(id: string): Promise<BookingDetail | null> {
  return loadBookingById(id);
}

const loadLatestBookingForGuest = cache(
  async (guestId: string): Promise<BookingDetail | null> => {
    const { data, error } = await getTenantScope().then(({ tenantId, supabase }) =>
      supabase
        .from("bookings")
        .select(BOOKING_DETAIL_SELECT)
        .eq("tenant_id", tenantId)
        .eq("guest_id", guestId)
        .neq("status", "anulata")
        .order("check_out", { ascending: false })
        .limit(1)
        .maybeSingle()
    );

    if (error) throw new Error(error.message);
    if (!data) return null;

    return mapBookingDetailFromRow(data as BookingDetailRow);
  }
);

/** Latest non-cancelled stay for a guest — one query (rebook flows). */
export async function getLatestBookingForGuest(
  guestId: string
): Promise<BookingDetail | null> {
  return loadLatestBookingForGuest(guestId);
}

export type BookingStayParams = {
  id: string;
  check_in: string;
  check_out: string;
  num_adults: number;
  num_children: number;
};

const loadBookingStayParams = cache(
  async (id: string): Promise<BookingStayParams | null> => {
    const { tenantId, supabase } = await getTenantScope();
    const { data, error } = await supabase
      .from("bookings")
      .select("id, check_in, check_out, num_adults, num_children")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return data as BookingStayParams;
  }
);

/** Lightweight stay window — parallel with full getBookingById on confirm flows. */
export async function getBookingStayParams(
  id: string
): Promise<BookingStayParams | null> {
  return loadBookingStayParams(id);
}
