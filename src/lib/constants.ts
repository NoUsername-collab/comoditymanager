/** Default check-in/out times when pension_settings omits them. */
export const DEFAULT_CHECK_IN_TIME = "14:00";
export const DEFAULT_CHECK_OUT_TIME = "11:00";

/** Fallback party size for booking forms (not an override of saved stays). */
export const DEFAULT_PARTY_ADULTS = 2;

/** Last-resort property name when display_name is empty — never overwrites a saved name. */
export const DEFAULT_PENSION_DISPLAY_NAME = "Pensiune";

export type PensionStayTimesInput = {
  default_check_in_time?: string | null;
  default_check_out_time?: string | null;
} | null;

/** Normalize DB/form clock values (`14:00:00` → `14:00`). Empty → null. */
export function clockHm(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/** Guest-facing stay times: pension settings win, else product defaults. */
export function resolvePensionStayTimes(pension?: PensionStayTimesInput): {
  checkIn: string;
  checkOut: string;
} {
  return {
    checkIn: clockHm(pension?.default_check_in_time) ?? DEFAULT_CHECK_IN_TIME,
    checkOut: clockHm(pension?.default_check_out_time) ?? DEFAULT_CHECK_OUT_TIME,
  };
}

/**
 * Operational check-in/out window: dedicated column if set, else pension stay
 * times, else product defaults. Never overrides a saved tenant value.
 */
export function resolveStayWindowTimes(input: {
  checkinTimeFrom?: string | null;
  checkoutTimeUntil?: string | null;
  defaultCheckInTime?: string | null;
  defaultCheckOutTime?: string | null;
}): { checkIn: string; checkOut: string } {
  return {
    checkIn:
      clockHm(input.checkinTimeFrom) ??
      clockHm(input.defaultCheckInTime) ??
      DEFAULT_CHECK_IN_TIME,
    checkOut:
      clockHm(input.checkoutTimeUntil) ??
      clockHm(input.defaultCheckOutTime) ??
      DEFAULT_CHECK_OUT_TIME,
  };
}
