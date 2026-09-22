import { getTranslations } from "next-intl/server";
import { PensionIdentityForm } from "@/features/settings/ui/PensionIdentityForm";
import { OperationalHoursForm } from "@/features/settings/ui/OperationalHoursForm";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { loadPensionIdentity } from "@/features/settings/loaders";
import {
  buildSettingsAlerts,
  guardSettingsPermission,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";

export const dynamic = "force-dynamic";

export default async function SettingsIdentityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params, ctx, identity] = await Promise.all([
    getTranslations("admin.pages.settings"),
    searchParams,
    guardSettingsPermission("pension_settings"),
    loadPensionIdentity(),
  ]);

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  const settings = ctx.pensionResult.settings;

  return (
    <SettingsPageLayout
      alerts={alerts}
      title={t("navIdentity")}
      description={t("navIdentityDesc")}
      previewHref="/"
      previewLabel={t("seeEffectPreview")}
      previewExternal
    >
      <SettingsSection title={t("identity.sectionTitle")} description={t("identity.sectionDesc")}>
        <PensionIdentityForm identity={identity} />
      </SettingsSection>
      {settings ? (
        <SettingsSection
          title={t("stayHours.title")}
          description={t("stayHours.subtitle")}
        >
          <OperationalHoursForm settings={settings} />
        </SettingsSection>
      ) : null}
    </SettingsPageLayout>
  );
}
