import { getTranslations } from "next-intl/server";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { SETTINGS_SECTION_REDIRECTS } from "@/domain/settings/settings-nav";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsOverview } from "@/components/admin/settings/SettingsOverview";
import { AdminCurrentThemeSummary } from "@/components/admin/settings/AdminCurrentThemeSummary";
import {
  buildSettingsAlerts,
  loadSettingsStaffContext,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";

export const dynamic = "force-dynamic";

export default async function SettingsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const legacySection = params.section;
  if (legacySection && SETTINGS_SECTION_REDIRECTS[legacySection]) {
    await redirect(SETTINGS_SECTION_REDIRECTS[legacySection]);
  }

  const [t, ctx] = await Promise.all([
    getTranslations("admin.pages.settings"),
    loadSettingsStaffContext(),
  ]);

  const { staff, pensionResult, appearance } = ctx;
  const { role, memberRole } = staff;
  const isOwner = memberRole === "owner";
  const error = pensionSettingsErrorMessage(pensionResult.error, t);
  const alerts = await buildSettingsAlerts(params, { isOwner });
  if (error) alerts.push({ tone: "error", message: error });

  const { settings } = pensionResult;

  if (!settings || !appearance) {
    return (
      <>
        <SettingsPageHeader title={t("navOverview")} description={t("notConfigured")} />
        <SettingsAlerts alerts={alerts} />
        <p className="settings-empty">{t("notConfigured")}</p>
      </>
    );
  }

  return (
    <>
      <SettingsAlerts alerts={alerts} />
      <SettingsPageHeader title={t("navOverview")} description={t("overviewIntro")} />
      <SettingsOverview
        role={role}
        memberRole={memberRole ?? "operator"}
        propertyName={settings.display_name}
        checkInTime={settings.default_check_in_time}
        checkOutTime={settings.default_check_out_time}
        themeSummary={<AdminCurrentThemeSummary />}
      />
    </>
  );
}
