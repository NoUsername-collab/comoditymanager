import { safeInternalPath } from "@/lib/security/safe-path";
import { getTranslations } from "next-intl/server";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { MfaEnrollmentPanel } from "@/features/settings/ui/MfaEnrollmentPanel";
import { AdminFactoryResetPanel } from "@/features/settings/ui/AdminFactoryResetPanel";
import { isFactoryResetEnabled } from "@/services/database-reset";
import { loadSettingsStaffContext } from "@/lib/settings/page-context";

export const dynamic = "force-dynamic";

export default async function SettingsSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const [tMfa, t, params, ctx] = await Promise.all([
    getTranslations("admin.mfa"),
    getTranslations("admin.pages.settings"),
    searchParams,
    loadSettingsStaffContext(),
  ]);

  const next = safeInternalPath(params.next, "/admin");

  const isOwner = ctx.staff.memberRole === "owner";
  const showFactoryReset = isOwner && isFactoryResetEnabled();
  const tLocation = showFactoryReset
    ? await getTranslations("admin.pages.settingsLocation")
    : null;

  return (
    <SettingsPageLayout
      title={t("navSecurity")}
      description={t("navSecurityDesc")}
      alerts={
        params.reset === "1" && tLocation
          ? [{ tone: "success", message: tLocation("resetCompleted") }]
          : undefined
      }
    >
      <SettingsSection title={tMfa("settingsSectionTitle")} description={tMfa("settingsSectionDesc")}>
        <MfaEnrollmentPanel next={next} />
      </SettingsSection>
      {showFactoryReset && tLocation ? (
        <SettingsSection
          title={tLocation("danger.title")}
          description={t("factoryResetHint")}
          className="settings-section--danger"
          defaultOpen={false}
        >
          <AdminFactoryResetPanel />
        </SettingsSection>
      ) : null}
    </SettingsPageLayout>
  );
}
