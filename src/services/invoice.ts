import { cache } from "react";
import { buildInformalInvoice, type InformalInvoice } from "@/domain/invoice/informal-invoice";
import { getBookingById } from "@/services/bookings";
import { getPensionSettings } from "@/services/pension-settings";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getTenantDisplayName } from "@/services/tenants";
import { getRoomsByIds } from "@/services/rooms-admin";

export type InvoiceContext = {
  invoice: InformalInvoice;
  pensionName: string;
  pensionAddress: string | null;
};

export const loadInformalInvoice = cache(async (
  bookingId: string
): Promise<InvoiceContext | null> => {
  const bookingPromise = getBookingById(bookingId);
  const [booking, settings, tenantDisplayName, bookingRooms] = await Promise.all([
    bookingPromise,
    getPensionSettings().catch(() => null),
    resolveTenantIdForData().then((id) => getTenantDisplayName(id)),
    bookingPromise.then((b) =>
      b && b.room_ids.length > 0 ? getRoomsByIds(b.room_ids) : []
    ),
  ]);
  if (!booking) return null;

  const roomsForInvoice = bookingRooms.map((r) => ({
    room_id: r.id,
    room_name: r.name,
    building_name: r.building_name,
    price_per_night: Number(r.price_per_night),
  }));

  const invoice = buildInformalInvoice({
    booking_id: booking.id,
    guest_name: booking.guest_name,
    guest_email: booking.guest_email,
    guest_phone: booking.guest_phone,
    check_in: booking.check_in,
    check_out: booking.check_out,
    total_price: booking.total_price,
    rooms: roomsForInvoice,
  });

  const pensionName = settings?.display_name?.trim() || tenantDisplayName;

  return {
    invoice,
    pensionName,
    pensionAddress: null,
  };
});

/** Estimare din camere selectate (la confirmare). */
export async function estimateInvoiceTotal(
  bookingId: string,
  roomIds: string[]
): Promise<number | null> {
  if (roomIds.length === 0) return null;

  const [booking, selectedRooms] = await Promise.all([
    getBookingById(bookingId),
    getRoomsByIds(roomIds),
  ]);
  if (!booking) return null;
  const roomMap = new Map(selectedRooms.map((r) => [r.id, r]));
  const rooms = roomIds
    .map((id) => roomMap.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({
      room_id: r.id,
      room_name: r.name,
      building_name: r.building_name,
      price_per_night: Number(r.price_per_night),
    }));

  return buildInformalInvoice({
    booking_id: booking.id,
    guest_name: booking.guest_name,
    guest_email: booking.guest_email,
    guest_phone: booking.guest_phone,
    check_in: booking.check_in,
    check_out: booking.check_out,
    total_price: null,
    rooms,
  }).subtotal;
}
