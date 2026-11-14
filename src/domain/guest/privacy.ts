/** How long identity documents are kept after a guest's last stay (months). */
export const GUEST_RETENTION_DEFAULT_MONTHS = 36;

/** The periods an owner can choose; the database accepts 6 to 120. */
export const GUEST_RETENTION_CHOICES = [12, 24, 36, 60, 120] as const;

export function isGuestRetentionMonths(value: number): boolean {
  return Number.isInteger(value) && value >= 6 && value <= 120;
}

/** The file name a guest's data export is saved under. */
export function guestExportFileName(guestId: string, today: string): string {
  return `oaspete-${guestId.slice(0, 8)}-${today}.json`;
}
