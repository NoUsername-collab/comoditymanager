import {
  assertBookingEditableAfterCheckout,
  canEditAfterCheckout,
} from "@/domain/booking/post-checkout-edit";
import { requireStaff } from "@/lib/auth/require-staff";
import { getCheckinSettings } from "@/services/checkin/settings";
import { getBookingById } from "./queries";

export async function resolvePostCheckoutEditPolicy() {
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

export async function assertPostCheckoutEditAllowed(bookingId: string) {
  const [booking, policy] = await Promise.all([
    getBookingById(bookingId),
    resolvePostCheckoutEditPolicy(),
  ]);
  if (!booking) throw new Error("booking.not_found");
  assertBookingEditableAfterCheckout(booking, policy);
  return booking;
}
