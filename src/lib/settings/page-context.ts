import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth/require-staff";
import {
  getPensionSettings,
  pensionAppearanceSettings,
  pensionStatisticsVisibility,
  pensionTeamPermissions,
} from "@/services/pension-settings";
import { canAccessStatistics } from "@/domain/settings/statistics-visibility";
import type { PermissionGroupId } from "@/domain/settings/team-permissions";
import { canStaffPermission } from "@/domain/settings/team-permissions";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { SettingsAlerts, type SettingsAlert } from "@/components/admin/settings/SettingsAlerts";

export const loadSettingsStaffContext = cache(async () => {
  const [staff, pensionResult] = await Promise.all([
    requireStaff(),
    getPensionSettings()
      .then((settings) => ({ settings, error: null as string | null }))
      .catch((e) => ({
        settings: null as Awaited<ReturnType<typeof getPensionSettings>>,
        error: e instanceof Error ? e.message : "generic",
      })),
  ]);

  const statisticsVisibility = pensionStatisticsVisibility(pensionResult.settings);
  const teamPermissions = pensionTeamPermissions(pensionResult.settings);
  const statisticsAccess =
    canStaffPermission(staff.memberRole, "reports_tools", teamPermissions) &&
    canAccessStatistics(staff.memberRole, statisticsVisibility);
  const appearance = pensionResult.settings
    ? pensionAppearanceSettings(pensionResult.settings)
    : null;

  return {
    staff,
    pensionResult,
    statisticsVisibility,
    statisticsAccess,
    teamPermissions,
    appearance,
  };
});

export type SettingsStaffContext = Awaited<
  ReturnType<typeof loadSettingsStaffContext>
>;

export async function guardSettingsPermission(group: PermissionGroupId) {
  const ctx = await loadSettingsStaffContext();
  if (!canStaffPermission(ctx.staff.memberRole, group, ctx.teamPermissions)) {
    await redirect("/admin/settings?access=permission");
  }
  return ctx;
}

export async function guardSettingsOwner() {
  const ctx = await loadSettingsStaffContext();
  if (ctx.staff.memberRole !== "owner") {
    await redirect("/admin/settings?access=role");
  }
  return ctx;
}

/** Fiscal billing edits are owner-only; admins may view. */
export function canEditFiscalBilling(ctx: SettingsStaffContext): boolean {
  return ctx.staff.memberRole === "owner";
}

/** Global theme and pension channel editors — owner and employed admin. */
export function canEditPensionSettingsUi(ctx: SettingsStaffContext): boolean {
  return ctx.staff.role === "admin";
}

export async function buildSettingsAlerts(
  params: Record<string, string | undefined>,
  options?: { isOwner?: boolean },
): Promise<SettingsAlert[]> {
  const t = await getTranslations("admin.pages.settings");
  const alerts: SettingsAlert[] = [
    params.saved === "1" ? { tone: "success", message: t("savedGeneric") } : null,
    params.location === "locked"
      ? { tone: "warning", message: t("locationLocked") }
      : null,
    params.location === "forbidden"
      ? { tone: "warning", message: t("locationForbidden") }
      : null,
    params.location === "closed"
      ? {
          tone: "info",
          message: options?.isOwner ? t("locationClosedOwner") : t("locationClosed"),
        }
      : null,
    params.statistics === "forbidden" || params.access === "statistics"
      ? { tone: "warning", message: t("statisticsForbidden") }
      : null,
    params.access === "role" || params.access === "permission"
      ? { tone: "warning", message: t("roleForbidden") }
      : null,
  ].filter((alert): alert is SettingsAlert => alert !== null);

  return alerts;
}

export function pensionSettingsErrorMessage(
  error: string | null,
  t: (key: string) => string,
): string | null {
  if (!error) return null;
  return error === "generic" ? t("genericError") : error;
}
