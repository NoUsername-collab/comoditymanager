import { getTranslations } from "next-intl/server";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { StaffList } from "@/features/settings/ui/StaffList";
import { StaffInviteForm } from "@/features/settings/ui/StaffInviteForm";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { listActiveTenantMembers } from "@/services/tenant-members";
import { guardSettingsPermission } from "@/lib/settings/page-context";

export default async function StaffManagementPage() {
  const tenantPromise = resolveRequestTenant();
  const [t, , members] = await Promise.all([
    getTranslations("admin.pages.staffManagement"),
    guardSettingsPermission("team_admin"),
    tenantPromise.then((resolvedTenant) =>
      resolvedTenant ? listActiveTenantMembers(resolvedTenant.id) : [],
    ),
  ]);

  return (
    <SettingsPageLayout title={t("title")} description={t("description")}>
      <SettingsSection
        title={t("currentStaffTitle")}
        description={t("currentStaffSubtitle", { count: members.length })}
        badge={<span className="settings-section__count">{members.length}</span>}
      >
        <StaffList members={members} />
      </SettingsSection>

      <SettingsSection title={t("inviteTitle")} description={t("inviteSubtitle")} defaultOpen={false}>
        <StaffInviteForm />
      </SettingsSection>

      <SettingsSection
        title={t("rolesExplainTitle")}
        description={t("rolesExplainSubtitle")}
        defaultOpen={false}
        collapsible={false}
      >
        <div className="settings-roles-grid">
          <div>
            <h3 className="settings-roles-grid__title">{t("roleOwnerTitle")}</h3>
            <p>{t("roleOwnerDesc")}</p>
          </div>
          <div>
            <h3 className="settings-roles-grid__title">{t("roleAdminTitle")}</h3>
            <p>{t("roleAdminDesc")}</p>
          </div>
          <div>
            <h3 className="settings-roles-grid__title">{t("roleOperatorTitle")}</h3>
            <p>{t("roleOperatorDesc")}</p>
          </div>
        </div>
      </SettingsSection>
    </SettingsPageLayout>
  );
}
