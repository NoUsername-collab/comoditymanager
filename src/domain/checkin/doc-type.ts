import type { GuestDocType } from "@/domain/guest/types";
import type { DocumentType } from "./types";

/** Aceleași valori ca la profilul clientului (`guests.doc_type`). */
export type CheckinUiDocType = GuestDocType;

const UI_DOC_TYPES: readonly CheckinUiDocType[] = [
  "ci",
  "passport",
  "foreign_id",
  "other",
] as const;

export function isCheckinUiDocType(
  value: string | null | undefined,
): value is CheckinUiDocType {
  return UI_DOC_TYPES.includes(value as CheckinUiDocType);
}

/** DB `checkin_guests.document_type` → valoare pentru UI. */
export function mapCheckinDocTypeFromDb(
  db: DocumentType | null | undefined,
): CheckinUiDocType | null {
  if (!db) return null;
  if (db === "ci") return "ci";
  if (db === "pasaport") return "passport";
  if (db === "permis") return "other";
  return null;
}

/** UI / formular → DB `checkin_guests.document_type`. */
export function mapCheckinDocTypeForDb(
  ui: CheckinUiDocType | DocumentType | null | undefined,
): DocumentType | null {
  if (!ui) return null;
  if (ui === "ci") return "ci";
  if (ui === "passport" || ui === "foreign_id" || ui === "pasaport") {
    return "pasaport";
  }
  if (ui === "other" || ui === "permis") return "permis";
  return null;
}

/** Valoare pentru `<select>` — acceptă atât UI cât și legacy DB. */
export function checkinUiDocTypeValue(
  stored: CheckinUiDocType | DocumentType | null | undefined,
): CheckinUiDocType | "" {
  if (!stored) return "";
  if (isCheckinUiDocType(stored)) return stored;
  return mapCheckinDocTypeFromDb(stored as DocumentType) ?? "";
}
