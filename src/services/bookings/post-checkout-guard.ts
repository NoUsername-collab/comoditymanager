import { cache } from "react";
import {
  assertBookingEditableAfterCheckout,
  canEditAfterCheckout,
} from "@/domain/booking/post-checkout-edit";
import { requireStaff } from "@/lib/auth/require-staff";
import { getCheckinSettings } from "@/services/checkin/settings";
import { getBookingById } from "./queries";

export type PostCheckoutBooking = { actual_check_out_at: string | null };

async function resolvePostCheckoutEditPolicyImpl() {
  const [{ memberRole }, settings] = await Promise.all([
    requireStaff(),
    getCheckinSettings(),
  ]);
  const allowPostCheckoutEdits = settings.allow_post_checkout_edits;
  return {
    memberRole,
    allowPostCheckoutEdits,
    canEditAfterCheckout: canEditAfterCheckout({
      memberRole,
      allowPostCheckoutEdits,
    }),
  };
}

export const resolvePostCheckoutEditPolicy = cache(
  resolvePostCheckoutEditPolicyImpl
);

/** Assert policy when the booking row is already loaded (no extra fetch). */
export async function assertBookingPostCheckoutEditAllowed(
  booking: PostCheckoutBooking
): Promise<void> {
  if (!booking.actual_check_out_at) return;
  const policy = await resolvePostCheckoutEditPolicy();
  assertBookingEditableAfterCheckout(booking, policy);
}

/** Assert policy by id when the caller does not have the row yet. */
export async function assertPostCheckoutEditAllowed(bookingId: string) {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.not_found");
  await assertBookingPostCheckoutEditAllowed(booking);
  return booking;
}
