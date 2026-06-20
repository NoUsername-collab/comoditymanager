import { getLocale, getTranslations } from "next-intl/server";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { FiscalBillingSettingsPanel } from "@/components/admin/settings/FiscalBillingSettingsPanel";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
import type { TenantCountry } from "@/domain/fiscal/country-fiscal-profile";
import { getBookingRulesSettings } from "@/services/booking-rules-settings";
import { getCheckinSettings, DEFAULT_CHECKIN_SETTINGS } from "@/services/checkin";
import { resolveRequestTenant } from "@/lib/tenant/active";
import {
  buildSettingsAlerts,
  loadSettingsStaffContext,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";

function resolveTenantCountry(country: string | null | undefined): TenantCountry {
  if (country === "BG" || country === "MD") return country;
  return "RO";
}

export const dynamic = "force-dynamic";

export default async function SettingsFiscalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params, ctx, bookingRules, checkinSettings, locale, tenant] =
    await Promise.all([
      getTranslations("admin.pages.settings"),
      searchParams,
      loadSettingsStaffContext(),
      getBookingRulesSettings().catch(() => null),
      getCheckinSettings().catch(() => DEFAULT_CHECKIN_SETTINGS),
      getLocale(),
      resolveRequestTenant(),
    ]);

  const { memberRole } = ctx.staff;
  const isOwner = memberRole === "owner";
  if (!isOwner && memberRole !== "admin") {
    await redirect("/admin/settings?access=role");
  }

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  const settings = ctx.pensionResult.settings;
  if (!settings || !bookingRules) {
    return (
      <>
        <SettingsPageHeader title={t("navFiscal")} />
        <SettingsAlerts alerts={alerts} />
      </>
    );
  }

  return (
    <>
      <SettingsAlerts alerts={alerts} />
      <SettingsPageHeader title={t("navFiscal")} description={t("navFiscalDesc")} />
      <SettingsSection title={t("fiscal.pageTitle")} description={t("fiscal.pageDesc")}>
        <FiscalBillingSettingsPanel
          country={resolveTenantCountry(tenant?.country)}
          propertyName={settings.display_name}
          bookingRules={bookingRules}
          checkinSettings={checkinSettings}
          locale={locale === "bg" ? "bg" : locale === "en" ? "en" : "ro"}
          readOnly={!isOwner}
        />
      </SettingsSection>
    </>
  );
}
