import {
  countCereriNoi,
  listCereriNoi,
  type BookingRow,
} from "@/services/bookings";
import {
  listBuildingDashboards,
  type BuildingDashboard,
} from "@/services/building-dashboard";
import { getPensionSettings } from "@/services/pension-settings";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { loadMonthComparison } from "@/services/month-comparison";
import { loadTodayBoard, type TodayBoard } from "@/services/today-board";
import { countConfirmedStays } from "@/services/milestones";
import {
  buildHomeBriefing,
  buildHomeMilestones,
  buildHomeMoodLine,
  type HomeMilestone,
} from "@/lib/admin-home-copy";
import type { MonthComparison } from "@/domain/statistics/month-compare";
import { platformPensionNameFallback } from "@/lib/platform/branding";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getTenantDisplayName } from "@/services/tenants";
import { getLocale, getTranslations } from "next-intl/server";

export type AdminDashboardStats = {
  buildingsCount: number;
  activeRooms: number;
  freeTonight: number;
  occupiedTonight: number;
  occupancyTonightPct: number;
  weekOccupancyPct: number;
};

export type AdminDashboardData = {
  pensionName: string;
  todayLabel: string;
  checkInTime: string;
  checkOutTime: string;
  cereriCount: number;
  cereriPreview: BookingRow[];
  stats: AdminDashboardStats;
  buildings: BuildingDashboard[];
  todayBoard: TodayBoard | null;
  monthCompare: MonthComparison | null;
  moodLine: string;
  briefingLine: string | null;
  milestones: HomeMilestone[];
  error: string | null;
};

function todayLabelForLocale(locale: string): string {
  const tag = locale === "ro" ? "ro-RO" : locale === "bg" ? "bg-BG" : "en-GB";
  return new Date().toLocaleDateString(tag, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const locale = await getLocale();
  const tDash = await getTranslations("admin.dashboard");
  const tCommon = await getTranslations("admin.common");

  const pensionFallback = platformPensionNameFallback();

  const fallback: AdminDashboardData = {
    pensionName: pensionFallback,
    todayLabel: todayLabelForLocale(locale),
    checkInTime: DEFAULT_CHECK_IN_TIME,
    checkOutTime: DEFAULT_CHECK_OUT_TIME,
    cereriCount: 0,
    cereriPreview: [],
    stats: {
      buildingsCount: 0,
      activeRooms: 0,
      freeTonight: 0,
      occupiedTonight: 0,
      occupancyTonightPct: 0,
      weekOccupancyPct: 0,
    },
    buildings: [],
    todayBoard: null,
    monthCompare: null,
    moodLine: tCommon("welcomeHome"),
    briefingLine: null,
    milestones: [],
    error: null,
  };

  try {
    const settings = await getPensionSettings().catch(() => null);
    const checkInTime =
      settings?.default_check_in_time ?? DEFAULT_CHECK_IN_TIME;
    const checkOutTime =
      settings?.default_check_out_time ?? DEFAULT_CHECK_OUT_TIME;

    const [cereriCount, cereriAll, buildings, todayBoard, monthCompare, totalConfirmed] =
      await Promise.all([
        countCereriNoi(),
        listCereriNoi(),
        listBuildingDashboards(),
        loadTodayBoard(checkInTime, checkOutTime).catch(() => null),
        loadMonthComparison().catch(() => null),
        countConfirmedStays().catch(() => 0),
      ]);

    let activeRooms = 0;
    let freeTonight = 0;
    let occupiedTonight = 0;
    let weekOccupied = 0;
    let weekTotal = 0;

    for (const b of buildings) {
      activeRooms += b.active_room_count;
      freeTonight += b.on_date.free_rooms_tonight ?? 0;
      occupiedTonight +=
        b.active_room_count - (b.on_date.free_rooms_tonight ?? 0);
      weekOccupied += b.week.occupied_room_nights;
      weekTotal += b.week.total_room_nights;
    }

    const occupancyTonightPct =
      activeRooms > 0
        ? Math.round((occupiedTonight / activeRooms) * 100)
        : 0;
    const weekOccupancyPct =
      weekTotal > 0 ? Math.round((weekOccupied / weekTotal) * 100) : 0;

    const stats = {
      buildingsCount: buildings.length,
      activeRooms,
      freeTonight,
      occupiedTonight,
      occupancyTonightPct,
      weekOccupancyPct,
    };

    const tenantId = await resolveTenantIdForData();

    return {
      pensionName:
        settings?.display_name ?? (await getTenantDisplayName(tenantId)),
      todayLabel: todayLabelForLocale(locale),
      checkInTime,
      checkOutTime,
      cereriCount,
      cereriPreview: cereriAll.slice(0, 5),
      stats,
      buildings,
      todayBoard,
      monthCompare,
      moodLine: buildHomeMoodLine(tDash, { stats, cereriCount, todayBoard }),
      briefingLine: buildHomeBriefing(tDash, { todayBoard, cereriCount }),
      milestones: buildHomeMilestones(tDash, {
        totalConfirmed,
        stats,
        monthCompare,
        cereriCount,
      }),
      error: null,
    };
  } catch (e) {
    return {
      ...fallback,
      error: e instanceof Error ? e.message : tCommon("loadDataError"),
    };
  }
}

/** Public home staff strip — skips month compare, milestones, mood copy. */
export async function loadStaffPublicPreview(): Promise<AdminDashboardData> {
  const locale = await getLocale();
  const tCommon = await getTranslations("admin.common");
  const pensionFallback = platformPensionNameFallback();

  const fallback: AdminDashboardData = {
    pensionName: pensionFallback,
    todayLabel: todayLabelForLocale(locale),
    checkInTime: DEFAULT_CHECK_IN_TIME,
    checkOutTime: DEFAULT_CHECK_OUT_TIME,
    cereriCount: 0,
    cereriPreview: [],
    stats: {
      buildingsCount: 0,
      activeRooms: 0,
      freeTonight: 0,
      occupiedTonight: 0,
      occupancyTonightPct: 0,
      weekOccupancyPct: 0,
    },
    buildings: [],
    todayBoard: null,
    monthCompare: null,
    moodLine: "",
    briefingLine: null,
    milestones: [],
    error: null,
  };

  try {
    const settings = await getPensionSettings().catch(() => null);
    const checkInTime =
      settings?.default_check_in_time ?? DEFAULT_CHECK_IN_TIME;
    const checkOutTime =
      settings?.default_check_out_time ?? DEFAULT_CHECK_OUT_TIME;

    const [cereriCount, cereriAll, buildings, todayBoard] = await Promise.all([
      countCereriNoi(),
      listCereriNoi(),
      listBuildingDashboards(),
      loadTodayBoard(checkInTime, checkOutTime).catch(() => null),
    ]);

    let activeRooms = 0;
    let freeTonight = 0;
    let occupiedTonight = 0;
    let weekOccupied = 0;
    let weekTotal = 0;

    for (const b of buildings) {
      activeRooms += b.active_room_count;
      freeTonight += b.on_date.free_rooms_tonight ?? 0;
      occupiedTonight +=
        b.active_room_count - (b.on_date.free_rooms_tonight ?? 0);
      weekOccupied += b.week.occupied_room_nights;
      weekTotal += b.week.total_room_nights;
    }

    const occupancyTonightPct =
      activeRooms > 0
        ? Math.round((occupiedTonight / activeRooms) * 100)
        : 0;
    const weekOccupancyPct =
      weekTotal > 0 ? Math.round((weekOccupied / weekTotal) * 100) : 0;

    const tenantId = await resolveTenantIdForData();

    return {
      pensionName:
        settings?.display_name ?? (await getTenantDisplayName(tenantId)),
      todayLabel: todayLabelForLocale(locale),
      checkInTime,
      checkOutTime,
      cereriCount,
      cereriPreview: cereriAll.slice(0, 5),
      stats: {
        buildingsCount: buildings.length,
        activeRooms,
        freeTonight,
        occupiedTonight,
        occupancyTonightPct,
        weekOccupancyPct,
      },
      buildings,
      todayBoard,
      monthCompare: null,
      moodLine: "",
      briefingLine: null,
      milestones: [],
      error: null,
    };
  } catch (e) {
    return {
      ...fallback,
      error: e instanceof Error ? e.message : tCommon("loadDataError"),
    };
  }
}
