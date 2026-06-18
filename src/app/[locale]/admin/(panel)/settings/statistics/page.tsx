import { getTranslations } from "next-intl/server";
import { StatisticsSettingsPanel } from "@/components/admin/settings/StatisticsSettingsPanel";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
import {
  buildSettingsAlerts,
  loadSettingsStaffContext,
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
    loadSettingsStaffContext(),
  ]);

  const { memberRole } = ctx.staff;
  const { statisticsAccess, statisticsVisibility } = ctx;
  const isOwner = memberRole === "owner";
  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  if (!isOwner && !statisticsAccess) {
    alerts.push({ tone: "warning", message: t("statisticsForbidden") });
  }

  return (
    <>
      <SettingsAlerts alerts={alerts} />
      <SettingsPageHeader title={t("navStatistics")} description={t("statisticsSubtitle")} />
      {(isOwner || statisticsAccess) ? (
        <SettingsSection title={t("statisticsTitle")} description={t("statisticsSubtitle")}>
          <StatisticsSettingsPanel
            visibility={statisticsVisibility}
            canConfigure={isOwner}
            canAccess={statisticsAccess}
          />
        </SettingsSection>
      ) : null}
    </>
  );
}
