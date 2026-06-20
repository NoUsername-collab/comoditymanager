import { getTranslations } from "next-intl/server";
import { TeamPermissionsPanel } from "@/components/admin/settings/TeamPermissionsPanel";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
import {
  buildSettingsAlerts,
  guardSettingsOwner,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";

export const dynamic = "force-dynamic";

export default async function SettingsTeamPermissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params, ctx] = await Promise.all([
    getTranslations("admin.pages.settings"),
    searchParams,
    guardSettingsOwner(),
  ]);

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  return (
    <>
      <SettingsAlerts alerts={alerts} />
      <SettingsPageHeader
        title={t("navTeamPermissions")}
        description={t("navTeamPermissionsDesc")}
      />
      <SettingsSection
        title={t("teamPermissionsSectionTitle")}
        description={t("teamPermissionsSectionDesc")}
      >
        <TeamPermissionsPanel permissions={ctx.teamPermissions} />
      </SettingsSection>
    </>
  );
}
