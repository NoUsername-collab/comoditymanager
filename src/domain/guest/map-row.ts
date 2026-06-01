import { parseGuestTags } from "@/domain/guest/tags";
import type { GuestRow } from "@/domain/guest/types";

function optStr(v: unknown): string | null {
  return v != null && v !== "" ? String(v) : null;
}

/** Map a Supabase `guests` row to {@link GuestRow} (profile loaded separately). */
export function mapGuestRow(row: Record<string, unknown>): GuestRow {
  return {
    id: String(row.id),
    last_name: String(row.last_name ?? ""),
    first_name: String(row.first_name ?? ""),
    display_name: String(row.display_name ?? ""),
    phone: optStr(row.phone),
    phone_normalized: optStr(row.phone_normalized),
    email: optStr(row.email),
    email_normalized: optStr(row.email_normalized),
    notes: optStr(row.notes),
    tags: parseGuestTags(row.tags),
    profile: null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    identity_status:
      (row.identity_status as GuestRow["identity_status"]) ?? "draft",
    doc_type: optStr(row.doc_type) as GuestRow["doc_type"],
    doc_series: optStr(row.doc_series),
    doc_number: optStr(row.doc_number),
    doc_issued_by: optStr(row.doc_issued_by),
    doc_issue_date: optStr(row.doc_issue_date),
    doc_expiry_date: optStr(row.doc_expiry_date),
    national_id_type: optStr(row.national_id_type) as GuestRow["national_id_type"],
    national_id: optStr(row.national_id),
    cnp: optStr(row.cnp),
    birth_date: optStr(row.birth_date),
    birth_place: optStr(row.birth_place),
    nationality: optStr(row.nationality),
    address: optStr(row.address),
    city: optStr(row.city),
    county: optStr(row.county),
    country: optStr(row.country),
    sex: optStr(row.sex) as GuestRow["sex"],
  };
}
