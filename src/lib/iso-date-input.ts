/** Normalize DB / free-text values for `<input type="date">` (YYYY-MM-DD). */
export function normalizeIsoDateInput(
  value: string | null | undefined,
): string {
  if (!value?.trim()) return "";
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dotted = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotted) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;
  const slashed = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashed) return `${slashed[3]}-${slashed[2]}-${slashed[1]}`;
  return "";
}
