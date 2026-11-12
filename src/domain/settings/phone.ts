import type { TenantCountry } from "@/domain/fiscal/country-fiscal-profile";

/**
 * Phone numbers are kept in international form ("+40730127427"): a link to
 * WhatsApp or a call works only with the country code, and a guest abroad
 * dials it anyway. Numbers are written the way people type them ("0730 127
 * 427", "0040 730…"), so they are turned into that form when saved, with the
 * property's country for the ones written without one. Kept in step with
 * migration 119.
 */
export const COUNTRY_DIAL_CODES: Record<TenantCountry, string> = {
  RO: "40",
  MD: "373",
  BG: "359",
};

/** The number in international form, or null when empty; text that is not a number is kept as written. */
export function internationalPhone(raw: string | null | undefined, country: TenantCountry): string | null {
  const text = raw?.trim() ?? "";
  if (!text) return null;
  const compact = text.replace(/[\s().\-/]/g, "");
  if (!/^\+?\d+$/.test(compact)) return text;
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  // A national number: the leading 0 gives way to the country code.
  if (compact.startsWith("0")) return `+${COUNTRY_DIAL_CODES[country]}${compact.slice(1)}`;
  // Already with a country code, only without "+" (e.g. "40730127427").
  if (Object.values(COUNTRY_DIAL_CODES).some((code) => compact.startsWith(code)) && compact.length >= 10) {
    return `+${compact}`;
  }
  return compact;
}

/** The contact's phone and WhatsApp in international form; the rest as it is. */
export function withInternationalPhones<T extends { phone?: string | null; whatsapp?: string | null }>(
  contact: T,
  country: TenantCountry,
): T {
  return {
    ...contact,
    ...(contact.phone !== undefined ? { phone: internationalPhone(contact.phone, country) } : {}),
    ...(contact.whatsapp !== undefined ? { whatsapp: internationalPhone(contact.whatsapp, country) } : {}),
  };
}
