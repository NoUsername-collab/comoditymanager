import { getTranslations } from "next-intl/server";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { EmailSettingsPanel } from "@/components/admin/settings/EmailSettingsPanel";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
import { getEmailDeliveryConfig } from "@/lib/email/provider";
import { resolveTransactionalEmailIdentity } from "@/services/email-identity";
import { getEmailSettings, DEFAULT_EMAIL_SETTINGS } from "@/services/email-settings";
import {
  buildSettingsAlerts,
  loadSettingsStaffContext,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";

export const dynamic = "force-dynamic";

export default async function SettingsEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params, ctx, emailSettings, emailIdentity] = await Promise.all([
    getTranslations("admin.pages.settings"),
    searchParams,
    loadSettingsStaffContext(),
    getEmailSettings().catch(() => DEFAULT_EMAIL_SETTINGS),
    resolveTransactionalEmailIdentity().catch(() => null),
  ]);

  const { memberRole } = ctx.staff;
  if (memberRole !== "owner" && memberRole !== "admin") {
    await redirect("/admin/settings");
  }

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  return (
    <>
      <SettingsAlerts alerts={alerts} />
      <SettingsPageHeader title={t("navEmail")} description={t("navEmailDesc")} />
      <SettingsSection title={t("emailTitle")} description={t("emailSubtitle")}>
        {emailIdentity ? (
          <EmailSettingsPanel
            settings={emailSettings}
            delivery={getEmailDeliveryConfig()}
            identity={emailIdentity}
          />
        ) : (
          <p>{t("genericError")}</p>
        )}
      </SettingsSection>
    </>
  );
}
