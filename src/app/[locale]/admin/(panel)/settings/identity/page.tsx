import { getTranslations } from "next-intl/server";
import { PensionIdentityForm } from "@/components/admin/settings/PensionIdentityForm";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
import { getPensionIdentity } from "@/services/pension-identity";
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
    getPensionIdentity(),
  ]);

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  return (
    <>
      <SettingsAlerts alerts={alerts} />
      <SettingsPageHeader title={t("navIdentity")} description={t("navIdentityDesc")} />
      <SettingsSection title={t("identity.sectionTitle")} description={t("identity.sectionDesc")}>
        <PensionIdentityForm identity={identity} />
      </SettingsSection>
    </>
  );
}
