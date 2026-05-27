import type { ActivityAction } from "./types";

/** @deprecated Use next-intl `admin.activity.{action}` instead */
export function activityActionLabel(action: ActivityAction): string {
  return action;
}
