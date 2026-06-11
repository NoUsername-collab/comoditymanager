/** Rezultat verificare identitate la check-in — blocaje + ofertă mutare titular. */

export type CheckinTransferOffer = {
  existingGuestId: string;
  existingGuestName: string;
  bookingGuestName: string;
};

export type CheckinIdentityResult = {
  blockers: string[];
  transferOffer?: CheckinTransferOffer;
};

export const CHECKIN_TRANSFER_REQUIRED_PREFIX = "checkin.transfer_required:";

export function encodeCheckinTransferRequired(
  offer: CheckinTransferOffer,
): string {
  return `${CHECKIN_TRANSFER_REQUIRED_PREFIX}${JSON.stringify(offer)}`;
}

export function decodeCheckinTransferRequired(
  message: string,
): CheckinTransferOffer | null {
  if (!message.startsWith(CHECKIN_TRANSFER_REQUIRED_PREFIX)) return null;
  try {
    return JSON.parse(
      message.slice(CHECKIN_TRANSFER_REQUIRED_PREFIX.length),
    ) as CheckinTransferOffer;
  } catch {
    return null;
  }
}
