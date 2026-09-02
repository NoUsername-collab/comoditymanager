export type GuestIdentityValues = {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
};

/** Pause after typing before hitting the guest lookup. */
export const IDENTITY_LOOKUP_DEBOUNCE_MS = 350;

export function hasLookupIdentity(values: GuestIdentityValues): boolean {
  return (
    values.email.trim().length > 0 ||
    values.phone.trim().length > 0 ||
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
  if (!input.phone.trim()) return false;
  if (input.emailRequired && !input.email.trim()) return false;
  return true;
}