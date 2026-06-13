import type { GuestDocType } from "@/domain/guest/types";
import { extractIdentityFromNationalId } from "@/domain/guest/national-id";
import type { NationalIdType } from "@/domain/guest/national-id";

export type GuestPrecheckinDocType = "" | "ci" | "pasaport" | "permis";

export type GuestPrecheckinPrefill = {
  lastName: string;
  firstName: string;
  phone: string;
  email: string;
  documentType: GuestPrecheckinDocType;
  documentNumber: string;
  nationalId: string;
  birthDate: string | null;
  nationality: string;
  notes: string;
  /** Date identitate din profilul client (aplicația recepție). */
  hasGuestProfile: boolean;
};

export type GuestPrecheckinPrefillBooking = {
  guestName: string;
  guestLastName?: string | null;
  guestFirstName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
};

export type GuestPrecheckinPrefillGuest = {
  lastName: string;
  firstName: string;
  phone?: string | null;
  email?: string | null;
  docType?: GuestDocType | null;
  docNumber?: string | null;
  nationalId?: string | null;
  nationalIdType?: NationalIdType | null;
  birthDate?: string | null;
  nationality?: string | null;
};

export function mapGuestDocTypeToPrecheckin(
  docType: GuestDocType | null | undefined,
): GuestPrecheckinDocType {
  if (docType === "ci") return "ci";
  if (docType === "passport") return "pasaport";
  if (docType === "foreign_id") return "permis";
  return "";
}

function splitGuestName(guestName: string): { lastName: string; firstName: string } {
  const parts = guestName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { lastName: "", firstName: "" };
  if (parts.length === 1) return { lastName: parts[0] ?? "", firstName: "" };
  return {
    lastName: parts[0] ?? "",
    firstName: parts.slice(1).join(" "),
  };
}

function resolveBookingNames(booking: GuestPrecheckinPrefillBooking): {
  lastName: string;
  firstName: string;
} {
  const lastName = booking.guestLastName?.trim() ?? "";
  const firstName = booking.guestFirstName?.trim() ?? "";
  if (lastName || firstName) return { lastName, firstName };
  return splitGuestName(booking.guestName);
}

function pickFirstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

/** Combină rezervarea + profilul client din aplicația recepție. */
export function buildGuestPrecheckinPrefill(input: {
  booking: GuestPrecheckinPrefillBooking;
  guest?: GuestPrecheckinPrefillGuest | null;
}): GuestPrecheckinPrefill {
  const bookingNames = resolveBookingNames(input.booking);
  const guest = input.guest;
  const hasGuestProfile = Boolean(guest);

  const lastName = pickFirstNonEmpty(guest?.lastName, bookingNames.lastName);
  const firstName = pickFirstNonEmpty(guest?.firstName, bookingNames.firstName);
  const phone = pickFirstNonEmpty(input.booking.guestPhone, guest?.phone);
  const email = pickFirstNonEmpty(input.booking.guestEmail, guest?.email);

  const nationalIdType = (guest?.nationalIdType ?? "cnp") as NationalIdType;
  const nationalId = guest?.nationalId?.trim() ?? "";
  const extracted = nationalId
    ? extractIdentityFromNationalId(nationalIdType, nationalId)
    : null;

  return {
    lastName,
    firstName,
    phone,
    email,
    documentType: mapGuestDocTypeToPrecheckin(guest?.docType),
    documentNumber: guest?.docNumber?.trim() ?? "",
    nationalId,
    birthDate: extracted?.birthDate ?? guest?.birthDate ?? null,
    nationality: guest?.nationality?.trim() || "România",
    notes: "",
    hasGuestProfile,
  };
}
