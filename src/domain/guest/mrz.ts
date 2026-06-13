import { parse } from "mrz";
import type { CheckinUiDocType } from "@/domain/checkin/doc-type";
import type { CheckinGuestInput } from "@/domain/checkin/types";
import {
  cleanNationalId,
  extractIdentityFromNationalId,
  validateNationalId,
  type NationalIdType,
} from "@/domain/guest/national-id";
import { detectMrzFormat, splitMrzInput } from "@/domain/guest/mrz-ocr";

export type MrzMappedIdentity = {
  lastName: string;
  firstName: string;
  nationality: string;
  birthDate: string | null;
  sex: "M" | "F" | null;
  documentType: CheckinUiDocType;
  documentNumber: string | null;
  nationalId: string | null;
  nationalIdType: NationalIdType | null;
  expiryDate: string | null;
  format: string;
  checksumValid: boolean;
};

export type MrzParseResult =
  | { ok: true; data: MrzMappedIdentity }
  | { ok: false; error: "empty" | "invalid_format" | "unsupported" };

const COUNTRY_LABELS: Record<string, string> = {
  ROU: "România",
  MDA: "Republica Moldova",
  BGR: "Bulgaria",
  GRC: "Grecia",
  HUN: "Ungaria",
  DEU: "Germania",
  FRA: "Franța",
  ITA: "Italia",
  ESP: "Spania",
  GBR: "Regatul Unit",
  USA: "Statele Unite",
};

const COUNTRY_TO_NATIONAL_ID: Record<string, NationalIdType> = {
  ROU: "cnp",
  MDA: "idnp",
  BGR: "egn",
  GRC: "amka",
  HUN: "szemelyi_szam",
};

function mrzBirthDateToIso(yymmdd: string | null | undefined): string | null {
  if (!yymmdd || !/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const century = yy <= 29 ? 2000 : 1900;
  return `${century + yy}-${mm}-${dd}`;
}

function mrzExpiryDateToIso(yymmdd: string | null | undefined): string | null {
  if (!yymmdd || !/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const century = yy >= 50 ? 1900 : 2000;
  return `${century + yy}-${mm}-${dd}`;
}

function countryLabel(code: string | null | undefined): string {
  if (!code?.trim()) return "";
  return COUNTRY_LABELS[code] ?? code;
}

function mrzSexToCode(value: unknown): "M" | "F" | null {
  const sex = String(value ?? "").toLowerCase();
  if (sex === "male" || sex === "m") return "M";
  if (sex === "female" || sex === "f") return "F";
  return null;
}

function inferDocumentType(
  format: string,
  documentCode: string | null | undefined,
  nationality: string | null | undefined,
): CheckinUiDocType {
  const code = (documentCode ?? "").toUpperCase();
  if (format === "TD3" || code.startsWith("P")) return "passport";
  if (code.startsWith("I") || code.startsWith("A") || code.startsWith("C")) {
    return nationality === "ROU" ? "ci" : "foreign_id";
  }
  return "foreign_id";
}

function pickPersonalNumber(fields: Record<string, unknown>): string | null {
  const optional1 = String(fields.optional1 ?? "").replace(/[^0-9]/g, "");
  const optional2 = String(fields.optional2 ?? "").replace(/[^0-9]/g, "");
  const personal = String(fields.personalNumber ?? "").replace(/[^0-9]/g, "");

  for (const candidate of [personal, optional1, optional2]) {
    if (candidate.length >= 10) return candidate;
  }
  return null;
}

function inferNationalId(
  nationalityCode: string | null | undefined,
  rawNumber: string | null,
): { type: NationalIdType | null; value: string | null } {
  if (!rawNumber) return { type: null, value: null };
  const cleaned = cleanNationalId(rawNumber);
  const preferredType = nationalityCode
    ? COUNTRY_TO_NATIONAL_ID[nationalityCode]
    : undefined;

  if (preferredType && validateNationalId(preferredType, cleaned)) {
    return { type: preferredType, value: cleaned };
  }

  for (const type of Object.values(COUNTRY_TO_NATIONAL_ID)) {
    if (validateNationalId(type, cleaned)) {
      return { type, value: cleaned };
    }
  }

  return { type: preferredType ?? null, value: cleaned || null };
}

export function parseMrzIdentity(input: string | string[]): MrzParseResult {
  const lines = Array.isArray(input) ? input.map((l) => l.trim()) : splitMrzInput(input);
  if (lines.length === 0) return { ok: false, error: "empty" };
  if (!detectMrzFormat(lines)) return { ok: false, error: "invalid_format" };

  let parsed;
  try {
    parsed = parse(lines, { autocorrect: true });
  } catch {
    return { ok: false, error: "unsupported" };
  }

  const fields = parsed.fields as Record<string, unknown>;
  const nationalityCode = String(fields.nationality ?? fields.issuingState ?? "").trim() || null;
  const lastName = String(fields.lastName ?? "").trim();
  const firstName = String(fields.firstName ?? "").trim();
  const documentNumber =
    parsed.documentNumber?.trim() ||
    String(fields.documentNumber ?? "").trim() ||
    null;

  const personalRaw = pickPersonalNumber(fields);
  const national = inferNationalId(nationalityCode, personalRaw);

  const data: MrzMappedIdentity = {
    lastName,
    firstName,
    nationality: countryLabel(nationalityCode),
    birthDate: mrzBirthDateToIso(String(fields.birthDate ?? "")),
    sex: mrzSexToCode(fields.sex),
    documentType: inferDocumentType(
      parsed.format,
      String(fields.documentCode ?? ""),
      nationalityCode,
    ),
    documentNumber,
    nationalId: national.value,
    nationalIdType: national.type,
    expiryDate: mrzExpiryDateToIso(String(fields.expirationDate ?? "")),
    format: parsed.format,
    checksumValid: parsed.valid,
  };

  if (!lastName && !firstName && !documentNumber && !national.value) {
    return { ok: false, error: "unsupported" };
  }

  return { ok: true, data };
}

/** Mapare MRZ → patch pentru formularul de check-in. */
export function mrzToGuestPatch(data: MrzMappedIdentity): Partial<CheckinGuestInput> {
  const patch: Partial<CheckinGuestInput> = {
    last_name: data.lastName || null,
    first_name: data.firstName || null,
    nationality: data.nationality || null,
    document_type: data.documentType,
    document_number: data.documentNumber,
    doc_expiry_date: data.expiryDate,
    national_id: data.nationalId,
    national_id_type: data.nationalIdType,
  };

  if (data.birthDate) {
    patch.birth_date = data.birthDate;
  } else if (data.nationalId && data.nationalIdType) {
    const extracted = extractIdentityFromNationalId(data.nationalIdType, data.nationalId);
    if (extracted?.birthDate) patch.birth_date = extracted.birthDate;
  }

  const fullName = [data.lastName, data.firstName].filter(Boolean).join(" ").trim();
  if (fullName) patch.full_name = fullName;

  return patch;
}

export type GuestProfileMrzFields = {
  docType: "ci" | "passport" | "foreign_id" | "other" | "";
  docNumber: string;
  docExpiryDate: string;
  nationalId: string;
  nationalIdType: NationalIdType;
  nationality: string;
  country: string;
  birthDate: string;
  sex: "M" | "F" | "";
  idAutoFilled: boolean;
};

/** Mapare MRZ → câmpuri profil client (admin). */
export function mrzToGuestProfileFields(data: MrzMappedIdentity): GuestProfileMrzFields {
  const docType =
    data.documentType === "passport"
      ? "passport"
      : data.documentType === "ci"
        ? "ci"
        : data.documentType === "foreign_id"
          ? "foreign_id"
          : data.documentType === "other"
            ? "other"
            : "";

  let birthDate = data.birthDate ?? "";
  let sex: "M" | "F" | "" = data.sex ?? "";
  let idAutoFilled = false;

  if (data.nationalId && data.nationalIdType) {
    const extracted = extractIdentityFromNationalId(data.nationalIdType, data.nationalId);
    if (extracted?.birthDate) {
      birthDate = extracted.birthDate;
      idAutoFilled = true;
    }
    if (extracted?.sex) {
      sex = extracted.sex;
      idAutoFilled = true;
    }
  } else if (data.birthDate) {
    idAutoFilled = Boolean(data.birthDate);
  }

  if (!sex && data.sex) sex = data.sex;

  const nationality = data.nationality || "";

  return {
    docType,
    docNumber: data.documentNumber ?? "",
    docExpiryDate: data.expiryDate ?? "",
    nationalId: data.nationalId ?? "",
    nationalIdType: data.nationalIdType ?? "cnp",
    nationality,
    country: nationality,
    birthDate,
    sex,
    idAutoFilled,
  };
}

export type PrecheckinMrzFields = {
  documentType: string;
  documentNumber: string;
  notesAppend: string;
};

/** Mapare MRZ → câmpuri pre-check-in guest app. */
export function mrzToPrecheckinFields(data: MrzMappedIdentity): PrecheckinMrzFields {
  const documentType =
    data.documentType === "passport"
      ? "pasaport"
      : data.documentType === "ci"
        ? "ci"
        : data.documentType === "foreign_id"
          ? "permis"
          : "";

  const noteParts: string[] = [];
  const fullName = [data.lastName, data.firstName].filter(Boolean).join(" ");
  if (fullName) noteParts.push(`Nume MRZ: ${fullName}`);
  if (data.nationalId) noteParts.push(`CNP/ID: ${data.nationalId}`);
  if (data.birthDate) noteParts.push(`Naștere: ${data.birthDate}`);
  if (data.nationality) noteParts.push(`Cetățenie: ${data.nationality}`);

  return {
    documentType,
    documentNumber: data.documentNumber ?? "",
    notesAppend: noteParts.join(" · "),
  };
}
