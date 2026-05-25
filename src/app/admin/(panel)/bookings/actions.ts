"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  cancelBooking,
  confirmBookingWithRooms,
} from "@/services/bookings";
import { resolveTotalPriceForConfirm } from "@/services/booking-confirm";

function revalidateBookingPaths(bookingId: string) {
  revalidateTag(CACHE_TAGS.bookingCounts, "max");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/cazari");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath(`/admin/bookings/${bookingId}/factura`);
  revalidatePath("/admin");
  revalidatePath("/admin/istoric");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/statistics");
  revalidatePath("/calendar");
}

export async function confirmBookingAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const roomIds = formData.getAll("room_ids").map(String).filter(Boolean);
  const total_price = await resolveTotalPriceForConfirm(id, roomIds, formData);

  await confirmBookingWithRooms(id, roomIds, total_price);

  revalidateBookingPaths(id);
  redirect("/admin/calendar?confirmed=1");
}

function appendQueryParam(path: string, key: string, value: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function cancelBookingAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/admin/bookings");
  await cancelBooking(id);
  revalidateBookingPaths(id);
  const base = returnTo.startsWith("/admin") ? returnTo : "/admin/bookings";
  redirect(appendQueryParam(base, "toast", "cancelled"));
}
