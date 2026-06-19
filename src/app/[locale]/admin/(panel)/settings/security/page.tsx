import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { isMfaMandatoryForUser } from "@/lib/auth/mfa-policy";
import { getMfaAccessState } from "@/lib/auth/mfa-session";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { MfaEnrollmentPanel } from "@/components/admin/settings/MfaEnrollmentPanel";
import { loadSettingsStaffContext } from "@/lib/settings/page-context";

export const dynamic = "force-dynamic";

export default async function SettingsSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [t, params, ctx, supabase] = await Promise.all([
    getTranslations("admin.mfa"),
    searchParams,
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

  const mfaState = await getMfaAccessState(supabase, {
    email: user?.email,
    memberRole: ctx.staff.memberRole,
  });

  const next =
    params.next?.startsWith("/") &&
    !params.next.startsWith("//") &&
    !params.next.includes("://")
      ? params.next
      : "/admin";

  const setupPending =
    mandatory && mfaState.kind === "needs_enrollment";

  return (
    <>
      <SettingsPageHeader title={t("settingsTitle")} description={t("settingsDesc")} />
      {setupPending ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t("settingsSetupRequired")}
        </p>
      ) : null}
      <SettingsSection title={t("settingsSectionTitle")} description={t("settingsSectionDesc")}>
        <MfaEnrollmentPanel mandatory={mandatory} next={next} />
      </SettingsSection>
    </>
  );
}
