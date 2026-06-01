import { buildInformalInvoice, type InformalInvoice } from "@/domain/invoice/informal-invoice";
import { getBookingById } from "@/services/bookings";
import { getPensionSettings } from "@/services/pension-settings";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getTenantDisplayName } from "@/services/tenants";
import { listAllRooms } from "@/services/rooms-admin";

export type InvoiceContext = {
  invoice: InformalInvoice;
  pensionName: string;
  pensionAddress: string | null;
};

export async function loadInformalInvoice(
  bookingId: string
): Promise<InvoiceContext | null> {
  const booking = await getBookingById(bookingId);
  if (!booking) return null;

  const [settings, allRooms] = await Promise.all([
    getPensionSettings().catch(() => null),
    listAllRooms(),
  ]);

  const roomMap = new Map(allRooms.map((r) => [r.id, r]));

  const roomsForInvoice =
    booking.room_ids.length > 0
      ? booking.room_ids
          .map((id) => roomMap.get(id))
          .filter((r): r is NonNullable<typeof r> => !!r)
          .map((r) => ({
            room_id: r.id,
            room_name: r.name,
            building_name: r.building_name,
            price_per_night: Number(r.price_per_night),
          }))
      : [];

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

  const tenantId = await resolveTenantIdForData();

  return {
    invoice,
    pensionName:
      settings?.display_name ?? (await getTenantDisplayName(tenantId)),
    pensionAddress: null,
  };
}

/** Estimare din camere selectate (la confirmare). */
export async function estimateInvoiceTotal(
  bookingId: string,
  roomIds: string[]
): Promise<number | null> {
  const booking = await getBookingById(bookingId);
  if (!booking || roomIds.length === 0) return null;

  const allRooms = await listAllRooms();
  const roomMap = new Map(allRooms.map((r) => [r.id, r]));
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
