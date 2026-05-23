"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { confirmBookingWithRooms } from "@/services/bookings";
import { resolveTotalPriceForConfirm } from "@/services/booking-confirm";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function quickConfirmAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const roomIds = formData.getAll("room_ids").map(String).filter(Boolean);
  const total_price = await resolveTotalPriceForConfirm(id, roomIds, formData);

  await confirmBookingWithRooms(id, roomIds, total_price);

  revalidatePath("/calendar");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  redirect("/receptie?confirmed=1");
}
