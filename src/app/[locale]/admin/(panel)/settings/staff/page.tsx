import { getTranslations } from "next-intl/server";
import { requireStaffRole } from "@/lib/auth/require-staff";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { SettingsSlidePanel } from "@/components/admin/settings/SettingsSlidePanel";
import { StaffList } from "@/components/admin/settings/StaffList";
import { StaffInviteForm } from "@/components/admin/settings/StaffInviteForm";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { listActiveTenantMembers } from "@/services/tenant-members";

export default async function StaffManagementPage() {
  const t = await getTranslations("admin.pages.staffManagement");

  // Only admin (owner) can manage staff
  await requireStaffRole(["admin"]);

  const tenant = await resolveRequestTenant();
  const members = tenant
    ? await listActiveTenantMembers(tenant.id)
    : [];

  return (
    <AdminRetroPageFrame
      title={t("title")}
      backHref="/admin/settings"
      backLabel={t("backToSettings")}
      className="admin-settings-page w-full max-w-none px-4 py-6 sm:px-6 lg:px-8"
      description={t("description")}
    >
      {/* Current staff */}
      <SettingsSlidePanel
        title={t("currentStaffTitle")}
        subtitle={t("currentStaffSubtitle", { count: members.length })}
        icon="*"
        defaultOpen
        badge={
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
            {members.length}
          </span>
        }
      >
        <StaffList members={members} />
      </SettingsSlidePanel>

      {/* Invite new member */}
      <SettingsSlidePanel
        title={t("inviteTitle")}
        subtitle={t("inviteSubtitle")}
        icon="+"
        defaultOpen={members.length <= 1}
      >
        <StaffInviteForm />
      </SettingsSlidePanel>

      {/* Role explanation */}
      <SettingsSlidePanel
        title={t("rolesExplainTitle")}
        subtitle={t("rolesExplainSubtitle")}
        icon="?"
      >
        <div className="space-y-4 text-sm text-zinc-600">
          <div>
            <h4 className="font-semibold text-zinc-900 mb-1">
              {t("roleOwnerTitle")}
            </h4>
            <p>{t("roleOwnerDesc")}</p>
          </div>
          <div>
            <h4 className="font-semibold text-zinc-900 mb-1">
              {t("roleAdminTitle")}
            </h4>
            <p>{t("roleAdminDesc")}</p>
          </div>
          <div>
            <h4 className="font-semibold text-zinc-900 mb-1">
              {t("roleOperatorTitle")}
            </h4>
            <p>{t("roleOperatorDesc")}</p>
          </div>
        </div>
      </SettingsSlidePanel>
    </AdminRetroPageFrame>
  );
}
