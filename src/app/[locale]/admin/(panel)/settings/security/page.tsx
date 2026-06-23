import { getTranslations } from "next-intl/server";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { MfaEnrollmentPanel } from "@/components/admin/settings/MfaEnrollmentPanel";

export const dynamic = "force-dynamic";

export default async function SettingsSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [t, params] = await Promise.all([
    getTranslations("admin.mfa"),
    searchParams,
  ]);

  const next =
    params.next?.startsWith("/") &&
    !params.next.startsWith("//") &&
    !params.next.includes("://")
      ? params.next
      : "/admin";

  return (
    <SettingsPageLayout title={t("settingsTitle")} description={t("settingsDesc")}>
      <SettingsSection title={t("settingsSectionTitle")} description={t("settingsSectionDesc")}>
        <MfaEnrollmentPanel next={next} />
      </SettingsSection>
    </SettingsPageLayout>
  );
}
