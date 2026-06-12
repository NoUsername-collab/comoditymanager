import { checkinUiDocTypeValue } from "@/domain/checkin/doc-type";
import type { CheckinGuestInput } from "./types";

/** Document de călătorie / identitate cu număr — necesită dată expirare. */
export function guestRequiresDocumentExpiry(guest: CheckinGuestInput): boolean {
  if (guest.keys_only || guest.present_at_checkin === false) return false;

  const docType = checkinUiDocTypeValue(guest.document_type);
  if (docType) return true;

  return Boolean(
    guest.document_number?.trim() || guest.document_series?.trim()
  );
}

export function guestHasDocumentExpiry(guest: CheckinGuestInput): boolean {
  return Boolean(guest.doc_expiry_date?.trim());
}
