import { getLocale, getTranslations } from "next-intl/server";
import { FiscalBillingSettingsPanel } from "@/features/settings/ui/FiscalBillingSettingsPanel";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import type { TenantCountry } from "@/domain/fiscal/country-fiscal-profile";
import { loadSettingsFiscalPage } from "@/features/settings/loaders";
import {
  buildSettingsAlerts,
  canEditFiscalBilling,
  guardSettingsPermission,
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
  const [t, params, ctx, fiscal, locale] = await Promise.all([
    getTranslations("admin.pages.settings"),
    searchParams,
    guardSettingsPermission("pension_settings"),
    loadSettingsFiscalPage(),
    getLocale(),
  ]);
  const { bookingRules, checkinSettings, tenantFiscalSettings, tenant } = fiscal;

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });
  const readOnly = !canEditFiscalBilling(ctx);
  if (readOnly) alerts.push({ tone: "info", message: t("fiscal.readOnly") });

  const settings = ctx.pensionResult.settings;
  if (!settings || !bookingRules || !tenantFiscalSettings) {
    return (
      <SettingsPageLayout alerts={alerts} title={t("navFiscal")}>
        <p className="settings-empty">{t("notConfigured")}</p>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      alerts={alerts}
      title={t("navFiscal")}
      description={t("navFiscalDesc")}
    >
      <SettingsSection title={t("fiscal.pageTitle")} description={t("fiscal.pageDesc")}>
        <FiscalBillingSettingsPanel
          country={resolveTenantCountry(tenant?.country)}
          propertyName={settings.display_name}
          bookingRules={bookingRules}
          checkinSettings={checkinSettings}
          tenantFiscalSettings={tenantFiscalSettings}
          locale={locale === "bg" ? "bg" : locale === "en" ? "en" : "ro"}
          readOnly={readOnly}
        />
      </SettingsSection>
    </SettingsPageLayout>
  );
}
