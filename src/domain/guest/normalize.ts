export const PLACEHOLDER_GUEST_EMAIL = "receptie@casaemil.local";

export function normalizeEmail(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return null;
  return s;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  const norm = normalizeEmail(email);
  return norm === PLACEHOLDER_GUEST_EMAIL;
}

/** Normalizează telefon românesc spre E.164 (+40…). */
const PHONE_PLACEHOLDER_VALUES = new Set([
  "",
  "—",
  "-",
  "–",
  "n/a",
  "na",
  "null",
  ".",
]);

/** Telefon valid (normalizabil), fără placeholder-e admin. */
export function isValidGuestPhone(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? "").trim();
  if (PHONE_PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) return false;
  return normalizePhone(trimmed) !== null;
}

export function assertValidGuestPhone(raw: string | null | undefined): void {
  if (!isValidGuestPhone(raw)) {
    throw new Error("guest.phone_required");
  }
}

export function normalizePhone(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  let cleaned = s.replace(/[\s\-().]/g, "");

  if (cleaned.startsWith("00")) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1).replace(/\D/g, "");
    return digits ? `+${digits}` : null;
  }

  const digitsOnly = cleaned.replace(/\D/g, "");
  if (!digitsOnly) return null;

  if (digitsOnly.startsWith("0") && digitsOnly.length >= 10) {
    return `+4${digitsOnly}`;
  }

  if (digitsOnly.startsWith("40") && digitsOnly.length >= 11) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("7") && digitsOnly.length === 9) {
    return `+40${digitsOnly}`;
  }

  return `+${digitsOnly}`;
}

export function hasGuestIdentity(input: {
  guest_email: string;
  guest_phone: string;
}): boolean {
  const email = normalizeEmail(input.guest_email);
  const phone = normalizePhone(input.guest_phone);
  if (phone) return true;
  if (email && !isPlaceholderEmail(email)) return true;
  return false;
}
