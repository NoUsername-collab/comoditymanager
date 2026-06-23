import {
  endOfMonthIso,
  endOfWeekIso,
  startOfMonthIso,
  startOfWeekIso,
} from "@/domain/cazari/date-buckets";
import { todayIso } from "@/lib/stay-dates";

export type ConfirmedStayLike = {
  check_in: string;
  check_out: string;
};

export type ConfirmedBucketKey = "today" | "week" | "month" | "upcoming";

export type ConfirmedBucketGroup<T extends ConfirmedStayLike> = {
  key: ConfirmedBucketKey;
  stays: T[];
};

/** Stay cards below this count render fully; above uses window virtualization. */
export const STAY_LIST_VIRTUAL_MIN_ITEMS = 18;

/** Estimated stacked stay-card height for window virtualizer (px, incl. gap). */
export const STAY_CARD_VIRTUAL_ROW_H = 148;

/** Non-today buckets start collapsed unless the user is searching. */
export function isConfirmedBucketExpandedByDefault(
  key: ConfirmedBucketKey,
  hasQuery: boolean
): boolean {
  if (hasQuery) return true;
  return key === "today";
}

export function groupConfirmedStays<T extends ConfirmedStayLike>(
  items: T[],
  today = todayIso()
): ConfirmedBucketGroup<T>[] {
  const weekStart = startOfWeekIso(today);
  const weekEnd = endOfWeekIso(today);
  const monthStart = startOfMonthIso(today);
  const monthEnd = endOfMonthIso(today);

  const todayItems: T[] = [];
  const weekItems: T[] = [];
  const monthItems: T[] = [];
  const upcomingItems: T[] = [];

  for (const stay of items) {
    if (stay.check_in <= today && stay.check_out > today) {
      todayItems.push(stay);
    } else if (stay.check_in >= weekStart && stay.check_in <= weekEnd) {
      weekItems.push(stay);
    } else if (stay.check_in >= monthStart && stay.check_in <= monthEnd) {
      monthItems.push(stay);
    } else {
      upcomingItems.push(stay);
    }
  }

  return [
    { key: "today", stays: todayItems },
    { key: "week", stays: weekItems },
    { key: "month", stays: monthItems },
    { key: "upcoming", stays: upcomingItems },
  ];
}
