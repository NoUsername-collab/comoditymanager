import type { ActivityAction } from "@/domain/activity/types";

/** Dot path under `admin.activity` (matches nested JSON, e.g. booking.checkin.set). */
export function activityMessageKey(action: ActivityAction): string {
  return action;
}
