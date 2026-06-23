import type { TenantMemberRole } from "@/domain/tenant/types";

export function canEditAfterCheckout(input: {
  memberRole: TenantMemberRole | null;
  allowPostCheckoutEdits: boolean;
}): boolean {
  if (input.memberRole === "owner") return true;
  return input.allowPostCheckoutEdits;
}

export function isBookingEditableAfterCheckout(
  booking: { actual_check_out_at: string | null },
  input: {
    memberRole: TenantMemberRole | null;
    allowPostCheckoutEdits: boolean;
  }
): boolean {
  if (!booking.actual_check_out_at) return true;
  return canEditAfterCheckout(input);
}

export function assertBookingEditableAfterCheckout(
  booking: { actual_check_out_at: string | null },
  input: {
    memberRole: TenantMemberRole | null;
    allowPostCheckoutEdits: boolean;
  }
): void {
  if (!isBookingEditableAfterCheckout(booking, input)) {
    throw new Error("booking.checkout_locked");
  }
}
