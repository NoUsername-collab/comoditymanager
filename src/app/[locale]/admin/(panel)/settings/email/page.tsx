import { getTranslations } from "next-intl/server";
import { EmailSettingsPanel } from "@/features/settings/ui/EmailSettingsPanel";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { getEmailDeliveryConfig } from "@/lib/email/provider";
import { loadSettingsEmailPage } from "@/features/settings/loaders";
import {
  buildSettingsAlerts,
  guardSettingsPermission,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";

export const dynamic = "force-dynamic";

export default async function SettingsEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params, ctx, { emailSettings, emailIdentity }] = await Promise.all([
    getTranslations("admin.pages.settings"),
    searchParams,
    guardSettingsPermission("pension_settings"),
    loadSettingsEmailPage(),
  ]);

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  return (
    <SettingsPageLayout
      alerts={alerts}
      title={t("navEmail")}
      description={t("navEmailDesc")}
    >
      <SettingsSection title={t("emailTitle")} description={t("emailSubtitle")}>
        {emailIdentity ? (
          <EmailSettingsPanel
            settings={emailSettings}
            delivery={getEmailDeliveryConfig()}
            identity={emailIdentity}
          />
        ) : (
          <p className="settings-empty settings-empty--error">{t("genericError")}</p>
        )}
      </SettingsSection>
    </SettingsPageLayout>
  );
}
