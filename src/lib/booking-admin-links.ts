import type { ActivityLogEntry } from "@/domain/activity/types";

/** Cod scurt unic (din UUID) — pentru a distinge rezervări cu același nume */
export function formatBookingRef(bookingId: string): string {
  const compact = bookingId.replace(/-/g, "").toUpperCase();
  if (compact.length < 8) return compact;
  return `${compact.slice(0, 4)} ${compact.slice(4, 8)}`;
}

export function bookingCalendarHref(checkInIso: string): string {
  const y = Number(checkInIso.slice(0, 4));
  const m = Number(checkInIso.slice(5, 7)) - 1;
  if (!Number.isFinite(y) || !Number.isFinite(m)) return "/admin/calendar";
  return `/admin/calendar?y=${y}&m=${m}`;
}

/** check-in din metadata jurnal sau din rezervare cunoscută */
export function activityCalendarHref(
  entry: ActivityLogEntry,
  fallbackCheckIn?: string | null
): string | null {
  if (entry.entity_type !== "booking") return null;

  const meta = entry.metadata ?? {};
  const checkIn =
    (typeof meta.check_in === "string" && meta.check_in) ||
    (typeof meta.to_check_in === "string" && meta.to_check_in) ||
    fallbackCheckIn ||
    null;

  if (!checkIn) return null;
  return bookingCalendarHref(checkIn);
}
