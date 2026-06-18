import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getPensionSettings } from "@/services/pension-settings";
import { requireStaff } from "@/lib/auth/require-staff";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { SettingsShell } from "@/components/admin/settings/SettingsShell";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [t, tCommon, staff, pensionResult] = await Promise.all([
    getTranslations("admin.pages.settings"),
    getTranslations("common"),
    requireStaff(),
    getPensionSettings().catch(() => null),
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
          propertyName={pensionResult?.display_name}
          checkInTime={pensionResult?.default_check_in_time}
          checkOutTime={pensionResult?.default_check_out_time}
        >
          {children}
        </SettingsShell>
      </Suspense>
    </AdminPageFrame>
  );
}
