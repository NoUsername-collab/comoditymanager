import { getTranslations } from "next-intl/server";
import { loadStatisticsMonthCompare } from "@/features/settings/loaders";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { MonthCompareCards } from "@/features/settings/ui/MonthCompareCards";

export async function MonthCompareSection() {
  const [tPages, monthCompare] = await Promise.all([
    getTranslations("admin.pages.statistics"),
    loadStatisticsMonthCompare(),
  ]);

  if (!monthCompare) return null;

  return (
    <AdminPanel title={tPages("monthCompare")} className="mb-4">
      <MonthCompareCards compare={monthCompare} showReportsLink={false} />
    </AdminPanel>
  );
}
