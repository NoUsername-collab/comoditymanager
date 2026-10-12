"use server";

import { revalidatePath } from "next/cache";
import { markGuestReceptionRequestSeen } from "@/services/guest-reception-requests";

export async function acknowledgeGuestReceptionRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "").trim();
  const bookingId = String(formData.get("bookingId") ?? "").trim();
  if (!requestId || !bookingId) return;

  await markGuestReceptionRequestSeen(bookingId, requestId);
  revalidatePath(`/admin/bookings/${bookingId}`);
}
