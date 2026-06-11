import type { GuestAccessDenyReason, GuestAccessWindow } from "./types";

export const DEFAULT_GUEST_ACCESS_WINDOW: GuestAccessWindow = {
  checkIn: "",
  checkOut: "",
  earlyAccessDays: 1,
};

/** Prima zi în care codul e activ (inclusiv). */
export function guestAccessOpensOn(
  checkIn: string,
  earlyAccessDays = 1,
): string {
  if (!checkIn || earlyAccessDays <= 0) return checkIn;
  const d = new Date(`${checkIn}T12:00:00`);
  d.setDate(d.getDate() - earlyAccessDays);
  return d.toISOString().slice(0, 10);
}

/** Ultima zi în care codul e activ (inclusiv — ziua de checkout). */
export function guestAccessClosesOn(checkOut: string): string {
  return checkOut;
}

export function isGuestAccessDateValid(
  today: string,
  window: GuestAccessWindow,
): GuestAccessDenyReason | null {
  const opens = guestAccessOpensOn(window.checkIn, window.earlyAccessDays);
  const closes = guestAccessClosesOn(window.checkOut);

  if (today < opens) return "before_check_in";
  if (today > closes) return "after_check_out";
  return null;
}

export function isGuestAccessBookingStatusValid(
  status: string,
): GuestAccessDenyReason | null {
  if (status === "confirmata") return null;
  return "booking_not_confirmed";
}
