import { cleanNationalId } from "@/domain/guest/national-id";
import { guestFullName } from "./identity-rules";
import type { CheckinGuestInput } from "./types";

export function guestNationalIdKey(guest: CheckinGuestInput): string | null {
  const raw = guest.national_id?.trim();
  if (!raw) return null;
  return cleanNationalId(raw);
}

/** Duplicate CNP / cod personal în același formular de check-in. */
export function findDuplicateNationalIdsInForm(
  guests: CheckinGuestInput[],
): string[] {
  const seen = new Map<string, string>();
  const blockers: string[] = [];

  for (const guest of guests) {
    const key = guestNationalIdKey(guest);
    if (!key) continue;
    const name = guestFullName(guest) || "Oaspete";
    const previous = seen.get(key);
    if (previous) {
      blockers.push(
        `Cod personal duplicat în formular (${key}): ${previous} și ${name}`,
      );
      continue;
    }
    seen.set(key, name);
  }

  return blockers;
}

export function holderNationalIdMatches(
  entered: string,
  holderNationalId: string | null | undefined,
  holderCnp: string | null | undefined,
): boolean {
  const enteredClean = cleanNationalId(entered);
  for (const raw of [holderNationalId, holderCnp]) {
    if (!raw?.trim()) continue;
    if (cleanNationalId(raw) === enteredClean) return true;
  }
  return false;
}
