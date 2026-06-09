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

  return {
    year: new Date(booking.check_in).getFullYear(),
    pensionName: settings.pension_display_name || "Pensiune",
    propertyAddress: settings.fisa_property_address?.trim() || "—",
    ownerCui: settings.fisa_owner_cui?.trim() || "",
    tourismLicense: settings.fisa_tourism_license?.trim() || "",
    roomLabel,
    guests: guests.map((g) => ({
      fullName: guestFullName(g),
      cnp: g.national_id?.trim() || "",
      documentId: [g.document_series, g.document_number].filter(Boolean).join(" ") || "",
      checkIn: booking.check_in,
      checkOut: booking.check_out,
    })),
  };
}
