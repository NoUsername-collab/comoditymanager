import { cache } from "react";
import { unstable_cache } from "next/cache";
import { buildMonthComparison, type MonthComparison } from "@/domain/statistics/month-compare";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { getTenantScope } from "@/lib/tenant/scope";
import { loadStatisticsBaseDataForTenant } from "@/services/statistics";

async function loadMonthComparisonForTenant(
  tenantId: string
): Promise<MonthComparison> {
  const { bookings, snapshot } = await loadStatisticsBaseDataForTenant(tenantId);
  return buildMonthComparison(bookings, snapshot);
}

const getCachedMonthComparison = (tenantId: string) =>
  unstable_cache(
    () => loadMonthComparisonForTenant(tenantId),
    ["month-comparison", tenantId],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 120,
    }
  );

const loadMonthComparisonCached = cache(async (): Promise<MonthComparison> => {
  const { tenantId } = await getTenantScope();
  return getCachedMonthComparison(tenantId)();
});

export async function loadMonthComparison(): Promise<MonthComparison> {
  return loadMonthComparisonCached();
}
