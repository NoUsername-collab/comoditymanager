import { validateNationalId, cleanNationalId } from "@/domain/guest/national-id";
import type { CheckinCnpRule, CheckinGuestInput } from "./types";

const RO_NATIONALITY = /^(ro|românia|romania|romanian)$/i;

export function isRomanianNationality(nationality: string | null | undefined): boolean {
  if (!nationality?.trim()) return true;
  return RO_NATIONALITY.test(nationality.trim());
}

export function guestFullName(guest: CheckinGuestInput): string {
  const last = guest.last_name?.trim() ?? "";
  const first = guest.first_name?.trim() ?? "";
  if (last || first) return `${last} ${first}`.trim();
  return guest.full_name?.trim() ?? "";
}

export function guestHasValidCnp(guest: CheckinGuestInput): boolean {
  const raw = guest.national_id?.trim();
  if (!raw) return false;
  return validateNationalId("cnp", cleanNationalId(raw)).valid;
}

export function guestHasForeignDocument(guest: CheckinGuestInput): boolean {
  const series = guest.document_series?.trim();
  const number = guest.document_number?.trim();
  return Boolean(series && number);
}

/** Identity complete per ANAF: RO → CNP valid; străini → CNP/ID sau serie+nr document. */
export function guestHasLegalIdentity(guest: CheckinGuestInput): boolean {
  if (isRomanianNationality(guest.nationality)) {
    return guestHasValidCnp(guest);
  }
  if (guest.national_id?.trim()) {
    const type = guest.national_id_type ?? "cnp";
    return validateNationalId(type, cleanNationalId(guest.national_id)).valid;
  }
  return guestHasForeignDocument(guest);
}

export function guestMissingIdentityLabel(guest: CheckinGuestInput): string {
  if (isRomanianNationality(guest.nationality)) {
    return "CNP obligatoriu (cetățean RO)";
  }
  return "Document identitate (serie + număr) sau cod personal";
}

export function evaluateCnpRule(
  guests: CheckinGuestInput[],
  rule: CheckinCnpRule,
): { blockers: string[]; flags: ("no_cnp" | "invalid_cnp")[] } {
  const blockers: string[] = [];
  const flags: ("no_cnp" | "invalid_cnp")[] = [];

  for (const guest of guests) {
    const name = guestFullName(guest) || "Oaspete";
    const ro = isRomanianNationality(guest.nationality);
    const hasLegal = guestHasLegalIdentity(guest);

    if (ro) {
      if (!guest.national_id?.trim()) {
        if (rule === "required") {
          blockers.push(`${name}: CNP obligatoriu`);
        }
        if (rule !== "optional") {
          flags.push("no_cnp");
        }
      } else if (!guestHasValidCnp(guest)) {
        blockers.push(`${name}: CNP invalid`);
        flags.push("invalid_cnp");
      }
      continue;
    }

    if (rule === "required" && !hasLegal) {
      blockers.push(`${name}: ${guestMissingIdentityLabel(guest)}`);
      flags.push("no_cnp");
    } else if (rule === "recommended" && !hasLegal) {
      flags.push("no_cnp");
    }
  }

  return { blockers, flags };
}
