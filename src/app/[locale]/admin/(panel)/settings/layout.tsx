import { Suspense } from "react";
import "@/styles/features/admin/admin-settings.css";
import "@/styles/features/layout/mobile-settings.css";
import "@/styles/features/admin/admin-checkin.css";
import "@/styles/features/admin/admin-public-site-studio.css";
import { getTranslations } from "next-intl/server";
import { loadSettingsStaffContext } from "@/lib/settings/page-context";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { SettingsShellWithSetupIssues } from "@/components/admin/settings/SettingsShellWithSetupIssues";
import { getRequestAdminPath } from "@/lib/auth/admin-path";
import { isPublicSiteStudioPath } from "@/domain/settings/public-site-studio-path";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminPath = await getRequestAdminPath();
  if (isPublicSiteStudioPath(adminPath)) {
    return children;
  }

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
