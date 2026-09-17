import { formatBookingRef } from "@/lib/booking-admin-links";

export function normalizeStaySearchValue(
  value: string | null | undefined
): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type StaySearchFields = {
  id: string;
  guest_name: string | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  room_names: string[];
};

export function matchesStaySearchQuery(
  stay: StaySearchFields,
  rawQuery: string
): boolean {
  const tokens = normalizeStaySearchValue(rawQuery)
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = normalizeStaySearchValue(
    [
      stay.guest_name,
      stay.guest_first_name,
      stay.guest_last_name,
      stay.guest_email,
      stay.guest_phone,
      stay.room_names.join(" "),
      formatBookingRef(stay.id),
      stay.id,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return tokens.every((token) => haystack.includes(token));
}
