"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { shiftBookingByDays } from "@/services/bookings";

export async function shiftBookingOnGanttAction(
  bookingId: string,
  dayDelta: number
): Promise<{ ok: true; check_in: string; check_out: string } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    if (!Number.isInteger(dayDelta) || Math.abs(dayDelta) > 366) {
      return { ok: false, error: "Mutare invalidă." };
    }
    const result = await shiftBookingByDays(bookingId, dayDelta);
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/cazari");
    revalidatePath("/admin/istoric");
    revalidatePath("/admin/statistics");
    revalidatePath(`/admin/bookings/${bookingId}`);
    return { ok: true, ...result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Eroare la mutare",
    };
  }
}
