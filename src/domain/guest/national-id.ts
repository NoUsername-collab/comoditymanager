/**
 * Multi-country national ID validation and data extraction.
 *
 * Each Balkan country has a unique personal identification number:
 *   🇷🇴 Romania  — CNP  (Cod Numeric Personal)           13 digits
 *   🇲🇩 Moldova  — IDNP (Identificator Numeric Personal) 13 digits
 *   🇧🇬 Bulgaria — EGN  (Единен граждански номер)         10 digits
 *   🇬🇷 Greece   — AMKA (ΑΜΚΑ)                           11 digits
 *   🇭🇺 Hungary  — Személyi szám                         11 digits
 *
 * All encode birth date + sex and have algorithmic check-digit validation.
 * This module provides a unified interface to validate any of them.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type NationalIdType = "cnp" | "idnp" | "egn" | "amka" | "szemelyi_szam";

export const NATIONAL_ID_TYPES: readonly NationalIdType[] = [
  "cnp",
  "idnp",
  "egn",
  "amka",
  "szemelyi_szam",
] as const;

/** Which country each national ID belongs to */
export const NATIONAL_ID_COUNTRY: Record<NationalIdType, string> = {
  cnp: "RO",
  idnp: "MD",
  egn: "BG",
  amka: "GR",
  szemelyi_szam: "HU",
};

/** Human-readable label keys (for translations) */
export const NATIONAL_ID_LABEL_KEY: Record<NationalIdType, string> = {
  cnp: "nationalId.cnp",
  idnp: "nationalId.idnp",
  egn: "nationalId.egn",
  amka: "nationalId.amka",
  szemelyi_szam: "nationalId.szemelyi",
};

/** Expected digit counts for quick format checks */
export const NATIONAL_ID_LENGTH: Record<NationalIdType, number> = {
  cnp: 13,
  idnp: 13,
  egn: 10,
  amka: 11,
  szemelyi_szam: 11,
};

export type NationalIdData = {
  sex: "M" | "F" | null;
  birthDate: string | null; // YYYY-MM-DD
};

export type NationalIdValidation = {
  valid: boolean;
  data: NationalIdData | null;
  error?: string;
};

// ─── Romania: CNP ────────────────────────────────────────────────────────────

const CNP_WEIGHTS = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];

function validateCnp(value: string): NationalIdValidation {
  const cleaned = value.replace(/\s/g, "");
  if (!/^\d{13}$/.test(cleaned)) {
    return { valid: false, data: null, error: "format" };
  }

  const digits = cleaned.split("").map(Number);
  const sum = CNP_WEIGHTS.reduce((acc, w, i) => acc + w * digits[i], 0);
  const remainder = sum % 11;
  const checkDigit = remainder === 10 ? 1 : remainder;
  if (checkDigit !== digits[12]) {
    return { valid: false, data: null, error: "checkDigit" };
  }

  const s = digits[0];
  let sex: "M" | "F";
  let centuryBase: number;

  if ([1, 3, 5, 7].includes(s)) sex = "M";
  else if ([2, 4, 6, 8].includes(s)) sex = "F";
  else return { valid: false, data: null, error: "sexDigit" };

  if (s <= 2) centuryBase = 1900;
  else if (s <= 4) centuryBase = 1800;
  else if (s <= 6) centuryBase = 2000;
  else centuryBase = 1900; // Foreign residents (7,8)

  const year = centuryBase + digits[1] * 10 + digits[2];
  const month = digits[3] * 10 + digits[4];
  const day = digits[5] * 10 + digits[6];

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, data: null, error: "date" };
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return {
    valid: true,
    data: { sex, birthDate: `${year}-${mm}-${dd}` },
  };
}

// ─── Moldova: IDNP ──────────────────────────────────────────────────────────
// IDNP format: 13 digits, similar structure to CNP
// First digit: 0=org, 1=male <1900, 2=female <1900, ... same pattern as CNP
// Moldova uses the same check-digit algorithm as Romania.

const IDNP_WEIGHTS = [7, 3, 1, 7, 3, 1, 7, 3, 1, 7, 3, 1];

function validateIdnp(value: string): NationalIdValidation {
  const cleaned = value.replace(/\s/g, "");
  if (!/^\d{13}$/.test(cleaned)) {
    return { valid: false, data: null, error: "format" };
  }

  const digits = cleaned.split("").map(Number);

  // IDNP check digit: weighted sum mod 10
  const sum = IDNP_WEIGHTS.reduce((acc, w, i) => acc + w * digits[i], 0);
  const checkDigit = sum % 10;
  if (checkDigit !== digits[12]) {
    return { valid: false, data: null, error: "checkDigit" };
  }

  // IDNP encodes birth date in positions 1-6 (YYMMDD) with century from first digit
  const s = digits[0];
  let sex: "M" | "F" | null = null;
  let centuryBase = 1900;

  // Moldova IDNP first digit convention:
  // 0 = juridical person
  // 1 = M born 1800-1899, 2 = F born 1800-1899
  // 3 = M born 1900-1999, 4 = F born 1900-1999
  // 5 = M born 2000-2099, 6 = F born 2000-2099
  // 7,8 = foreign residents
  // 9 = other
  if ([1, 3, 5, 7].includes(s)) sex = "M";
  else if ([2, 4, 6, 8].includes(s)) sex = "F";

  if (s <= 2) centuryBase = 1800;
  else if (s <= 4) centuryBase = 1900;
  else if (s <= 6) centuryBase = 2000;
  else centuryBase = 1900;

  const year = centuryBase + digits[1] * 10 + digits[2];
  const month = digits[3] * 10 + digits[4];
  const day = digits[5] * 10 + digits[6];

  let birthDate: string | null = null;
  if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    birthDate = `${year}-${mm}-${dd}`;
  }

  return { valid: true, data: { sex, birthDate } };
}

// ─── Bulgaria: EGN ──────────────────────────────────────────────────────────
// EGN format: 10 digits — YYMMDDSSSSC
//   YY = year, MM = month (+ offset for century), DD = day
//   SSSS = sequence (odd = male, even = female)
//   C = check digit
// Month encoding:
//   1-12    → born 1900-1999
//   21-32   → born 1800-1899
//   41-52   → born 2000-2099

const EGN_WEIGHTS = [2, 4, 8, 5, 10, 9, 7, 3, 6];

function validateEgn(value: string): NationalIdValidation {
  const cleaned = value.replace(/\s/g, "");
  if (!/^\d{10}$/.test(cleaned)) {
    return { valid: false, data: null, error: "format" };
  }

  const digits = cleaned.split("").map(Number);

  // Check digit
  const sum = EGN_WEIGHTS.reduce((acc, w, i) => acc + w * digits[i], 0);
  const checkDigit = sum % 11;
  const expected = checkDigit === 10 ? 0 : checkDigit;
  if (expected !== digits[9]) {
    return { valid: false, data: null, error: "checkDigit" };
  }

  // Decode birth date
  const yy = digits[0] * 10 + digits[1];
  let rawMonth = digits[2] * 10 + digits[3];
  const day = digits[4] * 10 + digits[5];

  let year: number;
  if (rawMonth >= 41) {
    // Born 2000-2099
    year = 2000 + yy;
    rawMonth -= 40;
  } else if (rawMonth >= 21) {
    // Born 1800-1899
    year = 1800 + yy;
    rawMonth -= 20;
  } else {
    // Born 1900-1999
    year = 1900 + yy;
  }

  if (rawMonth < 1 || rawMonth > 12 || day < 1 || day > 31) {
    return { valid: false, data: null, error: "date" };
  }

  // Sex: sequence digit at position 8 — even = male, odd = female
  const seqDigit = digits[8];
  const sex: "M" | "F" = seqDigit % 2 === 0 ? "M" : "F";

  const mm = String(rawMonth).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return {
    valid: true,
    data: { sex, birthDate: `${year}-${mm}-${dd}` },
  };
}

// ─── Greece: AMKA ───────────────────────────────────────────────────────────
// AMKA format: 11 digits — DDMMYYSSSSC
//   DD = day, MM = month, YY = year (no century info from AMKA alone)
//   SSSS = sequence (odd = male, even = female)
//   C = Luhn check digit

function luhnCheck(digits: number[]): boolean {
  let sum = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    // Double every second digit from the right (starting from position length-2)
    if ((digits.length - 1 - i) % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function validateAmka(value: string): NationalIdValidation {
  const cleaned = value.replace(/\s/g, "");
  if (!/^\d{11}$/.test(cleaned)) {
    return { valid: false, data: null, error: "format" };
  }

  const digits = cleaned.split("").map(Number);

  if (!luhnCheck(digits)) {
    return { valid: false, data: null, error: "checkDigit" };
  }

  const day = digits[0] * 10 + digits[1];
  const month = digits[2] * 10 + digits[3];
  const yy = digits[4] * 10 + digits[5];

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, data: null, error: "date" };
  }

  // AMKA doesn't encode century — assume 1900 for yy >= 30, 2000 for yy < 30
  const year = yy >= 30 ? 1900 + yy : 2000 + yy;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  // Sequence: position 6-9, odd = male, even = female
  const seq = digits[6] * 1000 + digits[7] * 100 + digits[8] * 10 + digits[9];
  const sex: "M" | "F" = seq % 2 === 1 ? "M" : "F";

  return {
    valid: true,
    data: { sex, birthDate: `${year}-${mm}-${dd}` },
  };
}

// ─── Hungary: Személyi szám ─────────────────────────────────────────────────
// Format: 11 digits — SYYMMDDSSSC
//   S = sex/century (1=M 1900s, 2=F 1900s, 3=M 2000s, 4=F 2000s)
//   YYMMDD = birth date
//   SSS = sequence
//   C = check digit (weighted sum mod 11)
// Note: This system was deprecated in 1996 but the numbers remain valid.

const HU_WEIGHTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function validateSzemelyiSzam(value: string): NationalIdValidation {
  const cleaned = value.replace(/[\s\-]/g, "");
  if (!/^\d{11}$/.test(cleaned)) {
    return { valid: false, data: null, error: "format" };
  }

  const digits = cleaned.split("").map(Number);

  // Check digit
  const sum = HU_WEIGHTS.reduce((acc, w, i) => acc + w * digits[i], 0);
  const checkDigit = sum % 11;
  if (checkDigit !== digits[10]) {
    return { valid: false, data: null, error: "checkDigit" };
  }

  const s = digits[0];
  let sex: "M" | "F";
  let centuryBase: number;

  if (s === 1) { sex = "M"; centuryBase = 1900; }
  else if (s === 2) { sex = "F"; centuryBase = 1900; }
  else if (s === 3) { sex = "M"; centuryBase = 2000; }
  else if (s === 4) { sex = "F"; centuryBase = 2000; }
  else {
    return { valid: false, data: null, error: "sexDigit" };
  }

  const year = centuryBase + digits[1] * 10 + digits[2];
  const month = digits[3] * 10 + digits[4];
  const day = digits[5] * 10 + digits[6];

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, data: null, error: "date" };
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return {
    valid: true,
    data: { sex, birthDate: `${year}-${mm}-${dd}` },
  };
}

// ─── Unified API ─────────────────────────────────────────────────────────────

const VALIDATORS: Record<NationalIdType, (v: string) => NationalIdValidation> = {
  cnp: validateCnp,
  idnp: validateIdnp,
  egn: validateEgn,
  amka: validateAmka,
  szemelyi_szam: validateSzemelyiSzam,
};

/**
 * Validate a national ID of any supported type.
 * Returns extracted sex + birthDate when valid.
 */
export function validateNationalId(
  type: NationalIdType,
  value: string
): NationalIdValidation {
  const validator = VALIDATORS[type];
  if (!validator) return { valid: false, data: null, error: "unknownType" };
  return validator(value);
}

/**
 * Quick boolean check.
 */
export function isValidNationalId(type: NationalIdType, value: string): boolean {
  return validateNationalId(type, value).valid;
}

/**
 * Clean a national ID value (remove spaces, dashes).
 */
export function cleanNationalId(value: string): string {
  return value.replace(/[\s\-]/g, "");
}

/** Sex + birth date extracted from a valid national ID (CNP, IDNP, EGN, etc.). */
export function extractIdentityFromNationalId(
  type: NationalIdType,
  raw: string | null | undefined
): NationalIdData | null {
  const cleaned = raw?.trim() ? cleanNationalId(raw) : "";
  if (!cleaned || cleaned.length !== NATIONAL_ID_LENGTH[type]) return null;
  const result = validateNationalId(type, cleaned);
  return result.valid ? result.data : null;
}

/**
 * Detect which national ID type a value might be based on length and patterns.
 * Returns null if no match. Useful for auto-detection.
 */
export function guessNationalIdType(value: string): NationalIdType | null {
  const cleaned = cleanNationalId(value);
  if (!/^\d+$/.test(cleaned)) return null;

  // Try each type and return the first valid one
  for (const type of NATIONAL_ID_TYPES) {
    if (cleaned.length === NATIONAL_ID_LENGTH[type]) {
      const result = validateNationalId(type, cleaned);
      if (result.valid) return type;
    }
  }
  return null;
}

/**
 * Infer the most likely national ID type from a country code.
 */
export function nationalIdTypeForCountry(countryCode: string): NationalIdType | null {
  const cc = countryCode.toUpperCase();
  switch (cc) {
    case "RO": return "cnp";
    case "MD": return "idnp";
    case "BG": return "egn";
    case "GR": return "amka";
    case "HU": return "szemelyi_szam";
    default: return null;
  }
}
