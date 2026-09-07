import { isValidGuestPhone } from "@/domain/guest/normalize";

export type GuestIdentityValues = {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
};

/** Pause after a complete identity field before hitting lookup. */
export const IDENTITY_LOOKUP_DEBOUNCE_MS = 200;

function hasLookupEmail(email: string): boolean {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  return at > 0 && trimmed.includes(".", at + 1);
}

/** Complete enough to search — not every keystroke of a phone number. */
function hasLookupPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return true;
  return digits.startsWith("7") && digits.length === 9;
}

export function hasLookupIdentity(values: GuestIdentityValues): boolean {
  return (
    hasLookupEmail(values.email) ||
    hasLookupPhone(values.phone) ||
    (values.lastName.trim().length > 1 && values.firstName.trim().length > 1)
  );
}

export function allIdentityEmpty(values: GuestIdentityValues): boolean {
  return (
    !values.lastName.trim() &&
    !values.firstName.trim() &&
    !values.email.trim() &&
    !values.phone.trim()
  );
}

export function identityFingerprint(values: GuestIdentityValues): string {
  return [
    values.lastName,
    values.firstName,
    values.email,
    values.phone,
  ]
    .map((value) => value.trim().toLowerCase())
    .join("\0");
}

/** Create is allowed only when lookup is unnecessary or finished for these values. */
export function areIdentityChecksReady(input: {
  values: GuestIdentityValues;
  pending: boolean;
  settledFingerprint: string | null;
}): boolean {
  if (input.pending) return false;
  if (!hasLookupIdentity(input.values)) return true;
  return input.settledFingerprint === identityFingerprint(input.values);
}

export function isBookingIdentitySubmitReady(input: {
  lastName: string;
  firstName: string;
  phone: string;
  email: string;
  identityChecksReady: boolean;
  emailRequired?: boolean;
}): boolean {
  if (!input.identityChecksReady) return false;
  if (!input.lastName.trim() || !input.firstName.trim()) return false;
  if (!hasLookupPhone(input.phone) || !isValidGuestPhone(input.phone)) return false;
  if (input.emailRequired && !input.email.trim()) return false;
  return true;
}