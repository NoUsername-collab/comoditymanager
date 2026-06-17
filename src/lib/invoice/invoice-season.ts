export type InvoiceSeason = "spring" | "summer" | "autumn" | "winter";

/** Meteorological seasons from check-in month (northern hemisphere). */
export function resolveInvoiceSeason(checkInIso: string): InvoiceSeason {
  const month = Number.parseInt(checkInIso.slice(5, 7), 10);
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}
