import type { BookingForCheckin, CheckinGuestInput } from "@/domain/checkin/types";

export function createInitialCheckinGuests(
  booking: BookingForCheckin,
): CheckinGuestInput[] {
  const count = Math.max(1, booking.num_adults);
  const roomLabel = booking.room_names?.[0] ?? "";

  return Array.from({ length: count }, (_, index) => {
    const isRep = index === 0;
    const lastName = isRep ? (booking.guest_last_name ?? "") : "";
    const firstName = isRep ? (booking.guest_first_name ?? "") : "";
    const fullName =
      isRep && (lastName || firstName)
        ? `${lastName} ${firstName}`.trim()
        : isRep
          ? booking.guest_name
          : "";

    return {
      full_name: fullName,
      last_name: lastName,
      first_name: firstName,
      phone: isRep ? (booking.guest_phone ?? "") : "",
      national_id: "",
      national_id_type: "cnp",
      document_type: null,
      document_series: "",
      document_number: "",
      nationality: "România",
      birth_date: null,
      room_label: roomLabel,
      is_representative: isRep,
      guest_id: null,
    };
  });
}
