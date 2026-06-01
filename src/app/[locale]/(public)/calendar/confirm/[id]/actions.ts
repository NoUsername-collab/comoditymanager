"use server";

import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { revalidatePublicBookingSurfaces } from "@/lib/cache/revalidate-admin";
import { confirmBookingWithRooms } from "@/services/bookings";
import { resolveTotalPriceForConfirm } from "@/services/booking-confirm";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function quickConfirmAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const roomIds = formData.getAll("room_ids").map(String).filter(Boolean);
  const total_price = await resolveTotalPriceForConfirm(id, roomIds, formData);

  await confirmBookingWithRooms(id, roomIds, total_price);

  revalidatePublicBookingSurfaces({ receptie: true });
  await redirect("/receptie?confirmed=1");
}
