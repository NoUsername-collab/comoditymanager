/**
 * Daily summary email data — cron-safe (no request tenant context).
 */

import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getTenantById } from "@/services/tenants";

export type DailySummaryGuestRow = {
  guestName: string;
  rooms: string[];
};

export type DailySummaryPayload = {
  pensionName: string;
  date: string;
  checkInsToday: DailySummaryGuestRow[];
  checkOutsToday: DailySummaryGuestRow[];
  pendingRequests: number;
  occupancyPercent: number;
};

const DEFAULT_TIMEZONE = "Europe/Bucharest";

function todayIsoInTimezone(timezone: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}

function mapBookingRows(
  rows: Array<{
    guest_name: string;
    booking_rooms: Array<{
      rooms: { name: string } | { name: string }[] | null;
    }>;
  }>,
): DailySummaryGuestRow[] {
  return rows.map((row) => {
    const rooms: string[] = [];
    for (const line of row.booking_rooms ?? []) {
      const r = line.rooms;
      const room = Array.isArray(r) ? r[0] : r;
      if (room?.name) rooms.push(room.name);
    }
    return { guestName: row.guest_name, rooms };
  });
}

export async function buildDailySummaryForTenant(
  tenantId: string,
  dateIso?: string,
): Promise<DailySummaryPayload | null> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;

  const timezone = tenant.timezone?.trim() || DEFAULT_TIMEZONE;
  const today = dateIso ?? todayIsoInTimezone(timezone);
  const supabase = createPublicAdminClient();

  const bookingSelect = `
    guest_name,
    booking_rooms (
      room_id,
      rooms ( name )
    )
  `;

  const [checkInsResult, checkOutsResult, pendingResult, roomsResult, occupiedResult] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(bookingSelect)
        .eq("tenant_id", tenantId)
        .eq("status", "confirmata")
        .eq("check_in", today),
      supabase
        .from("bookings")
        .select(bookingSelect)
        .eq("tenant_id", tenantId)
        .eq("status", "confirmata")
        .eq("check_out", today),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "cerere_noua"),
      supabase
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      supabase
        .from("booking_rooms")
        .select("room_id, bookings!inner(status, check_in, check_out, tenant_id)")
        .eq("bookings.tenant_id", tenantId)
        .eq("bookings.status", "confirmata")
        .lte("bookings.check_in", today)
        .gt("bookings.check_out", today),
    ]);

  const totalRooms = roomsResult.count ?? 0;
  const occupiedTonight = new Set(
    (occupiedResult.data ?? []).map((row) => row.room_id as string),
  ).size;
  const occupancyPercent =
    totalRooms > 0 ? Math.round((occupiedTonight / totalRooms) * 100) : 0;

  return {
    pensionName: tenant.display_name,
    date: today,
    checkInsToday: mapBookingRows(checkInsResult.data ?? []),
    checkOutsToday: mapBookingRows(checkOutsResult.data ?? []),
    pendingRequests: pendingResult.count ?? 0,
    occupancyPercent,
  };
}
