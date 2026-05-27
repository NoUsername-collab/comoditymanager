import type { AdminDashboardStats } from "@/services/admin-dashboard";
import type { TodayBoard } from "@/services/today-board";
import type { MonthComparison } from "@/domain/statistics/month-compare";

type T = (key: string, values?: Record<string, string | number | Date>) => string;

export function buildHomeMoodLine(
  t: T,
  input: {
    stats: AdminDashboardStats;
    cereriCount: number;
    todayBoard: TodayBoard | null;
  }
): string {
  const { stats, cereriCount, todayBoard } = input;

  if (cereriCount > 0) {
    return cereriCount === 1
      ? t("moodOneRequest")
      : t("moodManyRequests", { count: cereriCount });
  }

  const arrivals = todayBoard?.arrivals.length ?? 0;
  if (arrivals >= 3) {
    return t("moodBusyArrivals", { count: arrivals });
  }
  if (arrivals > 0) {
    return t("moodSomeArrivals", { count: arrivals });
  }

  if (stats.weekOccupancyPct >= 75) {
    return t("moodFullWeek");
  }

  if (stats.occupancyTonightPct === 0 && stats.activeRooms > 0) {
    return t("moodQuietEvening");
  }

  if (stats.freeTonight === stats.activeRooms && stats.activeRooms > 0) {
    return t("moodAllFree");
  }

  return t("moodDefault");
}

export function buildHomeBriefing(
  t: T,
  input: {
    todayBoard: TodayBoard | null;
    cereriCount: number;
  }
): string | null {
  const { todayBoard, cereriCount } = input;
  if (!todayBoard) return null;

  const parts: string[] = [];
  if (todayBoard.arrivals.length > 0) {
    parts.push(
      t("briefingArrivals", { count: todayBoard.arrivals.length })
    );
  }
  if (todayBoard.departures.length > 0) {
    parts.push(
      t("briefingDepartures", { count: todayBoard.departures.length })
    );
  }
  if (todayBoard.roomsToClean.length > 0) {
    parts.push(t("briefingClean", { count: todayBoard.roomsToClean.length }));
  }
  if (cereriCount > 0) {
    parts.push(t("briefingRequests", { count: cereriCount }));
  }

  if (parts.length === 0) {
    return t("briefingEmpty");
  }

  return `${t("briefingPrefix")} ${parts.join(" · ")}.`;
}

export type HomeMilestone = {
  id: string;
  emoji: string;
  label: string;
};

export function buildHomeMilestones(
  t: T,
  input: {
    totalConfirmed: number;
    stats: AdminDashboardStats;
    monthCompare: MonthComparison | null;
    cereriCount: number;
  }
): HomeMilestone[] {
  const out: HomeMilestone[] = [];
  const { totalConfirmed, stats, monthCompare, cereriCount } = input;

  if (totalConfirmed >= 1) {
    out.push({ id: "first", emoji: "🎉", label: t("milestoneFirst") });
  }
  if (totalConfirmed >= 10) {
    out.push({ id: "ten", emoji: "🏅", label: t("milestoneTen") });
  }
  if (totalConfirmed >= 50) {
    out.push({ id: "fifty", emoji: "⭐", label: t("milestoneFifty") });
  }
  if (totalConfirmed >= 100) {
    out.push({ id: "hundred", emoji: "💫", label: t("milestoneHundred") });
  }
  if (monthCompare && monthCompare.current.occupancyPct >= 50) {
    out.push({
      id: "month-half",
      emoji: "📈",
      label: t("milestoneMonthHalf", {
        pct: monthCompare.current.occupancyPct,
      }),
    });
  }
  if (stats.weekOccupancyPct >= 80) {
    out.push({
      id: "week-full",
      emoji: "🔥",
      label: t("milestoneWeekFull"),
    });
  }
  if (cereriCount === 0 && totalConfirmed > 0) {
    out.push({ id: "inbox-zero", emoji: "✨", label: t("milestoneInboxZero") });
  }

  return out.slice(-5);
}
