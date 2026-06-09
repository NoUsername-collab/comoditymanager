import type { CheckinGuestInput } from "./types";
import type { GuestRow } from "@/domain/guest/types";

export function mapGuestRowToCheckinInput(
  guest: GuestRow,
  options: {
    roomLabel: string;
    isRepresentative: boolean;
  },
): CheckinGuestInput {
  const docUi = guest.doc_type ?? "ci";

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
    birth_date: guest.birth_date,
    room_label: options.roomLabel,
    is_representative: options.isRepresentative,
    guest_id: guest.id,
    identity_status: guest.identity_status,
    present_at_checkin: true,
  };
}
