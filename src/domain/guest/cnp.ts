/**
 * Romanian CNP — backward-compatible re-export from national-id.ts
 */
import { validateNationalId, cleanNationalId } from "./national-id";
import type { NationalIdData } from "./national-id";

export type CnpData = {
  sex: "M" | "F";
  birthDate: string;
  countyCode: string;
};

/**
 * Validates a Romanian CNP and returns extracted data, or null if invalid.
 */
export function parseCnp(cnp: string): CnpData | null {
  const cleaned = cleanNationalId(cnp);
  const result = validateNationalId("cnp", cleaned);
  if (!result.valid || !result.data?.sex || !result.data?.birthDate) return null;

  // Extract county code (positions 7-8) — specific to CNP
  const countyCode = cleaned.slice(7, 9);

  return {
    sex: result.data.sex,
    birthDate: result.data.birthDate,
    countyCode,
  };
}

export function isValidCnp(cnp: string): boolean {
  return parseCnp(cnp) !== null;
}

export function formatCnpDisplay(cnp: string): string {
  const cleaned = cnp.replace(/\s/g, "");
  if (cleaned.length !== 13) return cnp;
  return `${cleaned.slice(0, 6)} ${cleaned.slice(6)}`;
}
