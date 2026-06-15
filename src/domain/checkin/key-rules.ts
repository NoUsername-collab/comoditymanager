/**
 * Key distribution rules — pure functions, no DB dependencies.
 * Determines whether keys can be handed for a specific room
 * based on the tenant's checkin_key_rule setting.
 */

import { guestHasLegalIdentity } from "./identity-rules";
import type { CheckinFlag, CheckinGuestInput, CheckinSettings } from "./types";

export type KeyEligibility = {
  allowed: boolean;
  reason?: "keys_blocked_no_id" | "keys_blocked_unpaid";
};

export function canHandKeysForRoom(
  roomLabel: string,
  guests: CheckinGuestInput[],
  settings: CheckinSettings,
  paymentAmountPaid: number,
  totalPrice: number,
): KeyEligibility {
  if (settings.checkin_key_rule === "always") {
    return { allowed: true };
  }

  if (settings.checkin_key_rule === "id_verified") {
    const roomGuests = guests.filter(
      (g) => g.room_label === roomLabel && !g.keys_only,
    );
    const hasVerified = roomGuests.some((g) => guestHasLegalIdentity(g));
    return hasVerified
      ? { allowed: true }
      : { allowed: false, reason: "keys_blocked_no_id" };
  }

  if (settings.checkin_key_rule === "paid") {
    if (totalPrice <= 0) return { allowed: true };
    const meets = paymentMeetsThreshold(
      paymentAmountPaid,
      totalPrice,
      settings,
    );
    return meets
      ? { allowed: true }
      : { allowed: false, reason: "keys_blocked_unpaid" };
  }

  return { allowed: true };
}

export function computeKeyEligibilityByRoom(
  rooms: string[],
  guests: CheckinGuestInput[],
  settings: CheckinSettings,
  paymentAmountPaid: number,
  totalPrice: number,
): Map<string, KeyEligibility> {
  const result = new Map<string, KeyEligibility>();
  for (const room of rooms) {
    result.set(
      room,
      canHandKeysForRoom(room, guests, settings, paymentAmountPaid, totalPrice),
    );
  }
  return result;
}

function paymentMeetsThreshold(
  paid: number,
  total: number,
  settings: CheckinSettings,
): boolean {
  if (settings.checkin_payment_rule === "at_checkout") return true;
  if (settings.checkin_payment_rule === "full") return paid >= total;
  const pct = total > 0 ? (paid / total) * 100 : 100;
  return pct >= settings.checkin_min_payment_pct;
}
