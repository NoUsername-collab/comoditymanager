import { Suspense } from "react";
import "@/app/admin/admin-settings.css";
import { getTranslations } from "next-intl/server";
import { loadSettingsStaffContext } from "@/lib/settings/page-context";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { SettingsShellWithSetupIssues } from "@/components/admin/settings/SettingsShellWithSetupIssues";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [t, tCommon, ctx] = await Promise.all([
    getTranslations("admin.pages.settings"),
    getTranslations("common"),
    loadSettingsStaffContext(),
  ]);

  const { staff, pensionResult, teamPermissions } = ctx;
  const { role, memberRole } = staff;
  const settings = pensionResult.settings;

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
        <SettingsShellWithSetupIssues
          role={role}
          memberRole={memberRole ?? "operator"}
          teamPermissions={teamPermissions}
          propertyName={settings?.display_name}
          checkInTime={settings?.default_check_in_time}
          checkOutTime={settings?.default_check_out_time}
          staffEmail={staff.user.email}
        >
          {children}
        </SettingsShellWithSetupIssues>
      </Suspense>
    </AdminPageFrame>
  );
}
