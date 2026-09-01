import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { requireStaff } from "@/lib/auth/require-staff";
import { loadStatisticsPageAccess } from "@/features/settings/loaders";
import { canAccessStatistics } from "@/domain/settings/statistics-visibility";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { MonthCompareSection } from "./_sections/MonthCompareSection";
import { StatisticsReportSection } from "./_sections/StatisticsReportSection";
import { StatisticsSkeleton } from "./_sections/StatisticsSkeleton";

export default async function AdminStatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const [tPages, { memberRole }, { visibility }, params] = await Promise.all([
    getTranslations("admin.pages.statistics"),
    requireStaff(),
    loadStatisticsPageAccess(),
    searchParams,
  ]);
  if (!canAccessStatistics(memberRole, visibility)) {
    await redirect("/admin/settings?access=statistics");
  }

  return (
    <AdminPageFrame
      title={tPages("title")}
      description={tPages("continuous")}
      className="statistics-page"
    >
      <Suspense fallback={<StatisticsSkeleton rows={3} />}>
        <MonthCompareSection />
      </Suspense>
      <Suspense fallback={<StatisticsSkeleton rows={8} />}>
        <StatisticsReportSection year={params.year} />
      </Suspense>
    </AdminPageFrame>
  );
}
