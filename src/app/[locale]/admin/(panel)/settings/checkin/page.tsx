import { getTranslations } from "next-intl/server";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { CheckinSettingsPanel } from "@/components/admin/checkin/CheckinSettingsPanel";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
import { getCheckinSettings, DEFAULT_CHECKIN_SETTINGS } from "@/services/checkin";
import {
  buildSettingsAlerts,
  loadSettingsStaffContext,
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
    loadSettingsStaffContext(),
    getCheckinSettings().catch(() => DEFAULT_CHECKIN_SETTINGS),
  ]);

  if (ctx.staff.role !== "admin") {
    await redirect("/admin/settings");
  }

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  return (
    <>
      <SettingsAlerts alerts={alerts} />
      <SettingsPageHeader title={t("navCheckin")} description={t("checkin.docRuleDesc")} />
      <SettingsSection title={t("checkin.title")} description={t("checkin.docRuleDesc")}>
        <p className="mb-4 text-sm text-zinc-500">{t("checkin.scheduleManagedInLocation")}</p>
        <CheckinSettingsPanel settings={checkinSettings} />
      </SettingsSection>
    </>
  );
}
