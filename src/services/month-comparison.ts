import { cache } from "react";
import { buildMonthComparison, type MonthComparison } from "@/domain/statistics/month-compare";
import { loadStatisticsBaseData } from "@/services/statistics";

const loadMonthComparisonCached = cache(async (): Promise<MonthComparison> => {
  const { bookings, snapshot } = await loadStatisticsBaseData();
  return buildMonthComparison(bookings, snapshot);
});

export async function loadMonthComparison(): Promise<MonthComparison> {
  return loadMonthComparisonCached();
}
