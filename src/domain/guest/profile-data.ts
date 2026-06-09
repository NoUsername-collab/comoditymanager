import type { GuestIdentityStatus, GuestRow } from "./types";

/** Client cu date minime în profil — nu e slot gol / neînregistrat. */
export function guestHasProfileData(
  guest: Pick<
    GuestRow,
    | "identity_status"
    | "phone"
    | "national_id"
    | "cnp"
    | "doc_number"
    | "last_name"
    | "first_name"
  >,
): boolean {
  if (guest.identity_status === "partial" || guest.identity_status === "complete") {
    return true;
  }
  return Boolean(
    guest.phone?.trim() ||
      guest.national_id?.trim() ||
      guest.cnp?.trim() ||
      guest.doc_number?.trim() ||
      (guest.last_name?.trim() && guest.first_name?.trim()),
  );
}

/** Identitate incompletă gravă pentru check-in ANAF (draft sau lipsă date legale). */
export function isIdentityStatusCritical(
  status: GuestIdentityStatus | null | undefined,
): boolean {
  return status === "draft";
}
