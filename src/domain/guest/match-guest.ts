export type GuestContactMatchInput = {
  lastName: string;
  firstName: string;
  phone?: string | null;
  email?: string | null;
  excludeGuestId?: string | null;
};

export type GuestMatchReason =
  | "phone_email_name"
  | "phone_email"
  | "phone_name"
  | "email_name"
  | "phone"
  | "email"
  | "name";

export type GuestContactMatchResult =
  | { status: "matched"; guestId: string; reason: GuestMatchReason }
  | { status: "ambiguous"; guestIds: string[]; reason: string }
  | { status: "none" };

function normalizeNamePart(value: string): string {
  return value.trim().toLowerCase();
}

function namesMatch(
  lastName: string,
  firstName: string,
  guest: { last_name: string; first_name: string }
): boolean {
  return (
    normalizeNamePart(lastName) === normalizeNamePart(guest.last_name) &&
    normalizeNamePart(firstName) === normalizeNamePart(guest.first_name)
  );
}

function singleId(ids: string[]): string | null {
  const unique = [...new Set(ids.filter(Boolean))];
  return unique.length === 1 ? unique[0]! : null;
}

function intersectIds(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return [...new Set(a.filter((id) => setB.has(id)))];
}

/**
 * Alege un singur client din candidați folosind combinații name/phone/email.
 * Pure — fără DB.
 */
export function pickGuestContactMatch(args: {
  input: GuestContactMatchInput;
  candidates: Array<{
    id: string;
    last_name: string;
    first_name: string;
    phone_normalized: string | null;
    email_normalized: string | null;
  }>;
  phoneNormalized: string | null;
  emailNormalized: string | null;
}): GuestContactMatchResult {
  const { input, candidates, phoneNormalized, emailNormalized } = args;
  const pool = candidates.filter(
    (row) => !input.excludeGuestId || row.id !== input.excludeGuestId
  );
  if (pool.length === 0) return { status: "none" };

  const byPhone = phoneNormalized
    ? pool.filter((row) => row.phone_normalized === phoneNormalized).map((row) => row.id)
    : [];
  const byEmail = emailNormalized
    ? pool.filter((row) => row.email_normalized === emailNormalized).map((row) => row.id)
    : [];
  const byName = pool
    .filter((row) => namesMatch(input.lastName, input.firstName, row))
    .map((row) => row.id);

  const phoneEmailName = intersectIds(intersectIds(byPhone, byEmail), byName);
  const phoneEmailNameId = singleId(phoneEmailName);
  if (phoneEmailNameId) {
    return { status: "matched", guestId: phoneEmailNameId, reason: "phone_email_name" };
  }

  const phoneEmailId = singleId(intersectIds(byPhone, byEmail));
  if (phoneEmailId) {
    return { status: "matched", guestId: phoneEmailId, reason: "phone_email" };
  }

  const phoneNameId = singleId(intersectIds(byPhone, byName));
  if (phoneNameId) {
    return { status: "matched", guestId: phoneNameId, reason: "phone_name" };
  }

  const emailNameId = singleId(intersectIds(byEmail, byName));
  if (emailNameId) {
    return { status: "matched", guestId: emailNameId, reason: "email_name" };
  }

  const phoneId = singleId(byPhone);
  if (phoneId) {
    return { status: "matched", guestId: phoneId, reason: "phone" };
  }

  const emailId = singleId(byEmail);
  if (emailId) {
    return { status: "matched", guestId: emailId, reason: "email" };
  }

  const nameId = singleId(byName);
  if (nameId) {
    return { status: "matched", guestId: nameId, reason: "name" };
  }

  const ambiguousIds = [
    ...new Set([...byPhone, ...byEmail, ...byName]),
  ];
  if (ambiguousIds.length > 1) {
    return {
      status: "ambiguous",
      guestIds: ambiguousIds,
      reason: "multiple_contact_matches",
    };
  }

  if (byPhone.length > 1 || byEmail.length > 1 || byName.length > 1) {
    return {
      status: "ambiguous",
      guestIds: ambiguousIds.length > 0 ? ambiguousIds : [...byPhone, ...byEmail, ...byName],
      reason: "duplicate_contact_field",
    };
  }

  return { status: "none" };
}
