/** Pension operational mood — drives home hero smoke / glow palette. */

export type PensionMood = "calm" | "active" | "alert";

export type PensionMoodInput = {
  /** Cereri noi awaiting confirmation */
  cereriCount: number;
  /** In-house guests (checked in, not out) with unpaid/partial payment */
  unpaidInHouseCount: number;
  /** Today's arrivals not yet checked in */
  pendingCheckIns: number;
};

export function computePensionMood(input: PensionMoodInput): PensionMood {
  if (input.unpaidInHouseCount > 0) return "alert";
  if (input.cereriCount > 0 || input.pendingCheckIns > 0) return "active";
  return "calm";
}
