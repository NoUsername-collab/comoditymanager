import { getTranslations } from "next-intl/server";
import { StatisticsSettingsPanel } from "@/features/settings/ui/StatisticsSettingsPanel";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import {
  buildSettingsAlerts,
  guardSettingsOwner,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";

export const dynamic = "force-dynamic";

export default async function SettingsStatisticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params, ctx] = await Promise.all([
    getTranslations("admin.pages.settings"),
    searchParams,
    guardSettingsOwner(),
  ]);

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  return (
    <SettingsPageLayout
      alerts={alerts}
      title={t("navStatistics")}
      description={t("statisticsAclSubtitle")}
    >
      <SettingsSection title={t("statisticsAclTitle")} description={t("statisticsAclSubtitle")}>
        <StatisticsSettingsPanel visibility={ctx.statisticsVisibility} />
      </SettingsSection>
    </SettingsPageLayout>
  );
}
