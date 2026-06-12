import type { GuestIdentityInput, GuestRow } from "./types";

function pickString(
  patch: string | null | undefined,
  current: string | null
): string | null {
  const next = patch?.trim();
  return next ? next : current;
}

/** Păstrează datele existente din profil; check-in completează doar câmpurile noi. */
export function mergeGuestIdentityPatch(
  current: GuestRow,
  patch: GuestIdentityInput
): GuestIdentityInput {
  return {
    doc_type: patch.doc_type ?? current.doc_type,
    doc_series: pickString(patch.doc_series, current.doc_series),
    doc_number: pickString(patch.doc_number, current.doc_number),
    doc_issued_by: pickString(patch.doc_issued_by, current.doc_issued_by),
    doc_issue_date: patch.doc_issue_date ?? current.doc_issue_date,
    doc_expiry_date: patch.doc_expiry_date ?? current.doc_expiry_date,
    national_id_type: patch.national_id_type ?? current.national_id_type,
    national_id: pickString(patch.national_id, current.national_id),
    cnp: pickString(patch.cnp, current.cnp),
    birth_date: patch.birth_date ?? current.birth_date,
    birth_place: pickString(patch.birth_place, current.birth_place),
    nationality: pickString(patch.nationality, current.nationality),
    address: pickString(patch.address, current.address),
    city: pickString(patch.city, current.city),
    county: pickString(patch.county, current.county),
    country: pickString(patch.country, current.country),
    sex: patch.sex ?? current.sex,
  };
}
