/** Guest loyalty reference — per property, not a login. */

/** Crockford base32 without I, L, O, U. */
export const LOYALTY_REF_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const NORMALIZE_MAP: Record<string, string> = {
  I: "1",
  L: "1",
  O: "0",
  U: "V",
};

export type GuestLoyaltyProgram = {
  enabled: boolean;
  /** Completed nights to unlock the property perk. 0 = card + book-again only. */
  nightsForPerk: number;
  perkTitle: string;
  perkDescription: string;
};

export const DEFAULT_GUEST_LOYALTY_PROGRAM: GuestLoyaltyProgram = {
  enabled: false,
  nightsForPerk: 5,
  perkTitle: "",
  perkDescription: "",
};

export function normalizeLoyaltyReference(raw: string): string {
  const compact = raw.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  let out = "";
  for (const ch of compact) {
    out += NORMALIZE_MAP[ch] ?? ch;
  }
  return out.slice(0, 8);
}

export function isLoyaltyReferenceFormat(raw: string): boolean {
  const code = normalizeLoyaltyReference(raw);
  if (code.length !== 8) return false;
  return [...code].every((ch) => LOYALTY_REF_ALPHABET.includes(ch));
}

export function formatLoyaltyReference(raw: string): string {
  const code = normalizeLoyaltyReference(raw);
  if (code.length !== 8) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function loyaltyPerkUnlocked(
  totalNights: number,
  nightsForPerk: number,
): boolean {
  if (nightsForPerk <= 0) return false;
  return totalNights >= nightsForPerk;
}

export function loyaltyNightsRemaining(
  totalNights: number,
  nightsForPerk: number,
): number {
  if (nightsForPerk <= 0) return 0;
  return Math.max(0, nightsForPerk - totalNights);
}

export function mapGuestLoyaltyProgram(raw: unknown): GuestLoyaltyProgram {
  if (!raw || typeof raw !== "object") return DEFAULT_GUEST_LOYALTY_PROGRAM;
  const row = raw as Record<string, unknown>;
  const nights = Number(row.nightsForPerk);
  return {
    enabled: row.enabled === true,
    nightsForPerk:
      Number.isFinite(nights) && nights >= 0
        ? Math.min(365, Math.round(nights))
        : DEFAULT_GUEST_LOYALTY_PROGRAM.nightsForPerk,
    perkTitle:
      typeof row.perkTitle === "string" ? row.perkTitle.slice(0, 120) : "",
    perkDescription:
      typeof row.perkDescription === "string"
        ? row.perkDescription.slice(0, 2000)
        : "",
  };
}

export function guestLoyaltyHref(reference: string): string {
  return `/guest/${formatLoyaltyReference(reference)}`;
}
