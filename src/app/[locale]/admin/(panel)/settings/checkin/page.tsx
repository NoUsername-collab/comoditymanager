import { getTranslations } from "next-intl/server";
import { CheckinSettingsPanel } from "@/components/admin/checkin/CheckinSettingsPanel";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { getCheckinSettings, DEFAULT_CHECKIN_SETTINGS } from "@/services/checkin";
import {
  buildSettingsAlerts,
  guardSettingsPermission,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";

export const dynamic = "force-dynamic";

export default async function SettingsCheckinPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params, ctx, checkinSettings] = await Promise.all([
    getTranslations("admin.pages.settings"),
    searchParams,
    guardSettingsPermission("pension_settings"),
    getCheckinSettings().catch(() => DEFAULT_CHECKIN_SETTINGS),
  ]);

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  return (
    <SettingsPageLayout
      alerts={alerts}
      title={t("navCheckin")}
      description={t("navCheckinDesc")}
    >
      <SettingsSection title={t("checkin.title")} description={t("checkin.docRuleDesc")}>
        <p className="admin-settings-hint mb-4">{t("checkin.scheduleManagedInLocation")}</p>
        <CheckinSettingsPanel settings={checkinSettings} />
      </SettingsSection>
    </SettingsPageLayout>
  );
}
