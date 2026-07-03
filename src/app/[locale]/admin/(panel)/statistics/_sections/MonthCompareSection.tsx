import { getTranslations } from "next-intl/server";
import { loadMonthComparison } from "@/services/month-comparison";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { MonthCompareCards } from "@/components/admin/dashboard/MonthCompareCards";

export async function MonthCompareSection() {
  const [tPages, monthCompare] = await Promise.all([
    getTranslations("admin.pages.statistics"),
    loadMonthComparison().catch(() => null),
  ]);

  if (!monthCompare) return null;

  return (
    <AdminPanel title={tPages("monthCompare")} className="mb-4">
      <MonthCompareCards compare={monthCompare} showReportsLink={false} />
    </AdminPanel>
  );
}
