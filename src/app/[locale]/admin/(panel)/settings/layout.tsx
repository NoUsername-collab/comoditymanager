import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getPensionSettings, pensionTeamPermissions } from "@/services/pension-settings";
import { requireStaff } from "@/lib/auth/require-staff";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { SettingsShell } from "@/components/admin/settings/SettingsShell";
import { resolveSetupIssues } from "@/services/setup-issues";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staffPromise = requireStaff();
  const [t, tCommon, staff, pensionResult, setupIssues] = await Promise.all([
    getTranslations("admin.pages.settings"),
    getTranslations("common"),
    staffPromise,
    getPensionSettings().catch(() => null),
    staffPromise.then((staffCtx) =>
      resolveSetupIssues({
        email: staffCtx.user.email,
        memberRole: staffCtx.memberRole,
      })
    ),
  ]);

  const { role, memberRole } = staff;

  const description =
    role === "operator" ? t("descriptionOperator") : t("descriptionAdmin");

  return (
    <AdminPageFrame
      title={t("title")}
      className="admin-settings-page admin-settings-page--shell w-full max-w-none"
      description={description}
      bodyClassName="admin-settings-page-body"
    >
      <Suspense fallback={<div className="settings-shell-loading">{tCommon("loading")}</div>}>
        <SettingsShell
          role={role}
          memberRole={memberRole ?? "operator"}
          teamPermissions={pensionTeamPermissions(pensionResult)}
          propertyName={pensionResult?.display_name}
          checkInTime={pensionResult?.default_check_in_time}
          checkOutTime={pensionResult?.default_check_out_time}
          setupIssues={setupIssues}
        >
          {children}
        </SettingsShell>
      </Suspense>
    </AdminPageFrame>
  );
}
