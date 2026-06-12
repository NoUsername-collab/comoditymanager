import type { GuestAccessDenyReason, GuestAccessWindow } from "./types";

export const DEFAULT_GUEST_ACCESS_WINDOW: GuestAccessWindow = {
  checkIn: "",
  checkOut: "",
  /** 0 = activ de la confirmare (fără așteptare înainte de check-in). */
  earlyAccessDays: 0,
};

/** Prima zi activă — la confirmare (earlyAccessDays 0) nu restricționăm înainte de check-in. */
export function guestAccessOpensOn(
  checkIn: string,
  earlyAccessDays = 0,
): string | null {
  if (earlyAccessDays <= 0) return null;
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

  if (opens && today < opens) return "before_check_in";
  if (today > closes) return "after_check_out";
  return null;
}

export function isGuestAccessBookingStatusValid(
  status: string,
): GuestAccessDenyReason | null {
  if (status === "confirmata") return null;
  return "booking_not_confirmed";
}
