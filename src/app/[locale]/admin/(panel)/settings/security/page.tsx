import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { isMfaMandatoryForUser } from "@/lib/auth/mfa-policy";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { MfaEnrollmentPanel } from "@/components/admin/settings/MfaEnrollmentPanel";
import { loadSettingsStaffContext } from "@/lib/settings/page-context";

export const dynamic = "force-dynamic";

export default async function SettingsSecurityPage() {
  const [t, ctx, supabase] = await Promise.all([
    getTranslations("admin.mfa"),
    loadSettingsStaffContext(),
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mandatory = isMfaMandatoryForUser({
    email: user?.email,
    memberRole: ctx.staff.memberRole,
  });

  return (
    <>
      <SettingsPageHeader title={t("settingsTitle")} description={t("settingsDesc")} />
      <SettingsSection title={t("settingsSectionTitle")} description={t("settingsSectionDesc")}>
        <MfaEnrollmentPanel mandatory={mandatory} next="/admin/settings/security" />
      </SettingsSection>
    </>
  );
}
