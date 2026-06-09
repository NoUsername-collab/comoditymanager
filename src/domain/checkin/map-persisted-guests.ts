import type { CheckinGuestInput, DocumentType } from "./types";

export type PersistedCheckinGuest = {
  full_name: string;
  last_name?: string | null;
  first_name?: string | null;
  phone?: string | null;
  national_id?: string | null;
  document_type?: DocumentType | null;
  document_series?: string | null;
  document_number?: string | null;
  nationality?: string | null;
  birth_date?: string | null;
  room_label?: string | null;
  is_representative?: boolean;
  guest_id?: string | null;
};

export function mapPersistedCheckinGuestsToInput(
  rows: PersistedCheckinGuest[],
): CheckinGuestInput[] {
  return rows.map((g) => ({
    full_name: g.full_name,
    last_name: g.last_name ?? null,
    first_name: g.first_name ?? null,
    phone: g.phone ?? null,
    national_id: g.national_id ?? null,
    document_type: g.document_type ?? null,
    document_series: g.document_series ?? null,
    document_number: g.document_number ?? null,
    nationality: g.nationality ?? null,
    birth_date: g.birth_date ?? null,
    room_label: g.room_label ?? null,
    is_representative: g.is_representative ?? false,
    guest_id: g.guest_id ?? null,
    present_at_checkin: true,
  }));
}
