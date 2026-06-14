import { checkinUiDocTypeValue } from "@/domain/checkin/doc-type";
import {
  guestHasValidCnp,
  isRomanianNationality,
} from "./identity-rules";
import type { CheckinGuestInput } from "./types";

/** Document de călătorie / identitate — necesită dată expirare când e relevant. */
export function guestRequiresDocumentExpiry(guest: CheckinGuestInput): boolean {
  if (guest.keys_only || guest.present_at_checkin === false) return false;

  const docType = checkinUiDocTypeValue(guest.document_type);

  // Carte de identitate RO: CNP valid acoperă identitatea legală (OPANAF).
  if (
    docType === "ci" &&
    isRomanianNationality(guest.nationality) &&
    guestHasValidCnp(guest)
  ) {
    return false;
  }

  if (docType === "passport" || docType === "foreign_id" || docType === "other") {
    return true;
  }

  if (docType === "ci") {
    return Boolean(
      guest.document_number?.trim() || guest.document_series?.trim(),
    );
  }

  // Fără tip selectat: cere expirare doar dacă există serie/număr fără CNP RO valid.
  if (
    isRomanianNationality(guest.nationality) &&
    guestHasValidCnp(guest)
  ) {
    return false;
  }

  return Boolean(
    guest.document_number?.trim() || guest.document_series?.trim(),
  );
}

export function guestHasDocumentExpiry(guest: CheckinGuestInput): boolean {
  return Boolean(guest.doc_expiry_date?.trim());
}
