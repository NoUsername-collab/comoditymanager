import type { ParseResult } from "@/domain/settings/schemas/shared";

const CLOCK_HM = /^([01]\d|2[0-3]):[0-5]\d$/;

export type OperationalHours = {
  checkInTime: string;
  checkOutTime: string;
  extraBedsMax: number;
};

export function normalizeClockHm(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hm = trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed;
  return CLOCK_HM.test(hm) ? hm : null;
}

/**
 * Same-calendar-day hotel window: checkout must be strictly earlier
 * than check-in (e.g. 11:00 out, 14:00 in).
 */
export function parseOperationalHours(input: {
  checkInTime: string;
  checkOutTime: string;
  extraBedsMax: unknown;
}): ParseResult<OperationalHours> {
  const checkInTime = normalizeClockHm(input.checkInTime);
  const checkOutTime = normalizeClockHm(input.checkOutTime);
  if (!checkInTime || !checkOutTime) {
    return { ok: false, error: "settings.invalid_stay_hours" };
  }
  if (checkOutTime >= checkInTime) {
    return { ok: false, error: "settings.checkout_must_be_before_checkin" };
  }

  const extraBedsMax = Number(input.extraBedsMax);
  if (
    !Number.isFinite(extraBedsMax) ||
    !Number.isInteger(extraBedsMax) ||
    extraBedsMax < 0 ||
    extraBedsMax > 999
  ) {
    return { ok: false, error: "settings.invalid_extra_beds" };
  }

  return {
    ok: true,
    data: { checkInTime, checkOutTime, extraBedsMax },
  };
}
