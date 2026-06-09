import { guestsToPersist } from "./guest-layout";
import { guestFullName } from "./identity-rules";
import type { BookingForCheckin, CheckinGuestInput, CheckinSettings } from "./types";

export type TouristSheetGuestRow = {
  fullName: string;
  cnp: string;
  documentId: string;
  checkIn: string;
  checkOut: string;
};

export type TouristSheetData = {
  year: number;
  issuedAt: string;
  registryRef: string;
  pensionName: string;
  propertyAddress: string;
  ownerCui: string;
  tourismLicense: string;
  roomLabel: string;
  guests: TouristSheetGuestRow[];
};

export function buildTouristSheetData(
  booking: BookingForCheckin,
  guests: CheckinGuestInput[],
  settings: CheckinSettings,
): TouristSheetData {
  const roomLabel =
    booking.room_names?.join(", ") ||
    guests.find((g) => g.room_label)?.room_label ||
    "—";

  const now = new Date();
  const issuedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const persisted = guestsToPersist(guests);

  return {
    year: new Date(booking.check_in).getFullYear(),
    issuedAt,
    registryRef: booking.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
    pensionName: settings.pension_display_name || "Pensiune",
    propertyAddress: settings.fisa_property_address?.trim() || "—",
    ownerCui: settings.fisa_owner_cui?.trim() || "",
    tourismLicense: settings.fisa_tourism_license?.trim() || "",
    roomLabel,
    guests: persisted.map((g) => ({
      fullName: guestFullName(g),
      cnp: g.national_id?.trim() || "",
      documentId: [g.document_series, g.document_number].filter(Boolean).join(" ") || "",
      checkIn: booking.check_in,
      checkOut: booking.check_out,
    })),
  };
}
