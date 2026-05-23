/** Nume complet pentru liste / detalii: „Popescu Maria” */
export function formatGuestFullName(
  lastName: string,
  firstName: string
): string {
  return `${lastName.trim()} ${firstName.trim()}`.trim();
}

/** Etichetă Gantt: nume familie + inițială prenume — „Popescu M.” */
export function formatGuestGanttLabel(
  lastName: string | null | undefined,
  firstName: string | null | undefined,
  fallbackFullName?: string | null
): string {
  const last = lastName?.trim() ?? "";
  const first = firstName?.trim() ?? "";

  if (last && first) {
    const initial = first.charAt(0).toLocaleUpperCase("ro-RO");
    return `${last} ${initial}.`;
  }
  if (last) return last;

  const fb = fallbackFullName?.trim();
  if (!fb) return "—";

  const parts = fb.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const ln = parts[0];
    const initial = parts[1].charAt(0).toLocaleUpperCase("ro-RO");
    return `${ln} ${initial}.`;
  }
  return fb;
}

/** Inițiale pentru avatar pe bara Gantt (ex. „PM”). */
export function guestInitials(
  lastName: string | null | undefined,
  firstName: string | null | undefined,
  fallbackFullName?: string | null
): string {
  const last = lastName?.trim() ?? "";
  const first = firstName?.trim() ?? "";
  if (last && first) {
    return `${last.charAt(0)}${first.charAt(0)}`.toLocaleUpperCase("ro-RO");
  }
  if (last.length >= 2) return last.slice(0, 2).toLocaleUpperCase("ro-RO");
  if (last.length === 1) return last.toLocaleUpperCase("ro-RO");

  const fb = fallbackFullName?.trim() ?? "";
  const parts = fb.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toLocaleUpperCase(
      "ro-RO"
    );
  }
  if (fb.length >= 2) return fb.slice(0, 2).toLocaleUpperCase("ro-RO");
  return fb.slice(0, 1).toLocaleUpperCase("ro-RO") || "?";
}

export function guestNamesFromForm(formData: FormData): {
  guest_last_name: string;
  guest_first_name: string;
  guest_name: string;
} {
  const guest_last_name = String(formData.get("guest_last_name") ?? "").trim();
  const guest_first_name = String(formData.get("guest_first_name") ?? "").trim();

  if (!guest_last_name || !guest_first_name) {
    throw new Error("Completează numele de familie și prenumele");
  }

  return {
    guest_last_name,
    guest_first_name,
    guest_name: formatGuestFullName(guest_last_name, guest_first_name),
  };
}
