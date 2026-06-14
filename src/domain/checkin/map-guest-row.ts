import type { CheckinGuestInput } from "./types";
import type { GuestRow } from "@/domain/guest/types";
import {
  extractIdentityFromNationalId,
  type NationalIdType,
} from "@/domain/guest/national-id";
import { normalizeIsoDateInput } from "@/lib/iso-date-input";

export function mapGuestRowToCheckinInput(
  guest: GuestRow,
  options: {
    roomLabel: string;
    isRepresentative: boolean;
  },
): CheckinGuestInput {
  const docUi = guest.doc_type ?? "ci";
  const nationalIdType = (guest.national_id_type ?? "cnp") as NationalIdType;
  const nationalId = guest.national_id ?? guest.cnp ?? "";
  const extracted = nationalId
    ? extractIdentityFromNationalId(nationalIdType, nationalId)
    : null;

  return {
    full_name:
      guest.display_name?.trim() ||
      `${guest.last_name ?? ""} ${guest.first_name ?? ""}`.trim(),
    last_name: guest.last_name ?? "",
    first_name: guest.first_name ?? "",
    phone: guest.phone ?? "",
    national_id: guest.national_id ?? guest.cnp ?? "",
    national_id_type: guest.national_id_type ?? "cnp",
    document_type: docUi || "ci",
    document_series: guest.doc_series ?? "",
    document_number: guest.doc_number ?? "",
    nationality: guest.nationality ?? "România",
    birth_date: extracted?.birthDate ?? guest.birth_date,
    doc_expiry_date: normalizeIsoDateInput(guest.doc_expiry_date) || null,
    room_label: options.roomLabel,
    is_representative: options.isRepresentative,
    guest_id: guest.id,
    identity_status: guest.identity_status,
    present_at_checkin: true,
  };
}
