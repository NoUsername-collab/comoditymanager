import type { GuestRow } from "@/domain/guest/types";
import { formatCnpDisplay } from "@/domain/guest/cnp";
import { formatRoDate } from "@/lib/stay-dates";

export type GuestIdentitySummaryLine = {
  key: string;
  label: string;
  value: string;
};

type SummaryLabels = {
  nationalIdTypes: Record<string, string>;
  docTypes: Record<string, string>;
  docType: string;
  sex: string;
  sexM: string;
  sexF: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  address: string;
  docExpiryDate: string;
};

function formatNationalId(guest: GuestRow): string | null {
  const raw = guest.national_id ?? guest.cnp;
  if (!raw?.trim()) return null;
  const type = guest.national_id_type ?? "cnp";
  return type === "cnp" ? formatCnpDisplay(raw) : raw.trim();
}

function formatDocumentValue(guest: GuestRow, docTypes: Record<string, string>): string | null {
  if (!guest.doc_type) return null;
  const typeLabel = docTypes[guest.doc_type] ?? guest.doc_type;
  const serial = [guest.doc_series, guest.doc_number].filter(Boolean).join(" ").trim();
  return serial ? `${typeLabel} · ${serial}` : typeLabel;
}

function formatAddress(guest: GuestRow): string | null {
  const parts = [
    guest.address?.trim(),
    guest.city?.trim(),
    guest.county?.trim(),
    guest.country?.trim() && guest.country !== "România" ? guest.country.trim() : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Linii compacte pentru cardul profil — doar câmpuri populate. */
export function buildGuestIdentitySummaryLines(
  guest: GuestRow,
  labels: SummaryLabels
): GuestIdentitySummaryLine[] {
  const lines: GuestIdentitySummaryLine[] = [];

  const nationalId = formatNationalId(guest);
  if (nationalId) {
    const idType = guest.national_id_type ?? "cnp";
    lines.push({
      key: "national_id",
      label: labels.nationalIdTypes[idType] ?? idType.toUpperCase(),
      value: nationalId,
    });
  }

  const document = formatDocumentValue(guest, labels.docTypes);
  if (document) {
    lines.push({
      key: "document",
      label: labels.docType,
      value: document,
    });
  }

  if (guest.birth_date) {
    const sexLabel =
      guest.sex === "M"
        ? labels.sexM
        : guest.sex === "F"
          ? labels.sexF
          : null;
    const birthValue = sexLabel
      ? `${formatRoDate(guest.birth_date)} · ${sexLabel}`
      : formatRoDate(guest.birth_date);
    lines.push({
      key: "birth",
      label: labels.birthDate,
      value: birthValue,
    });
  } else if (guest.sex) {
    lines.push({
      key: "sex",
      label: labels.sex,
      value: guest.sex === "M" ? labels.sexM : labels.sexF,
    });
  }

  if (guest.nationality?.trim()) {
    lines.push({
      key: "nationality",
      label: labels.nationality,
      value: guest.nationality.trim(),
    });
  }

  if (guest.birth_place?.trim()) {
    lines.push({
      key: "birth_place",
      label: labels.birthPlace,
      value: guest.birth_place.trim(),
    });
  }

  const address = formatAddress(guest);
  if (address) {
    lines.push({
      key: "address",
      label: labels.address,
      value: address,
    });
  }

  if (guest.doc_expiry_date) {
    lines.push({
      key: "doc_expiry",
      label: labels.docExpiryDate,
      value: formatRoDate(guest.doc_expiry_date),
    });
  }

  return lines;
}
