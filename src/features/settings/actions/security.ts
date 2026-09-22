"use server";

import { revalidatePath } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import {
  requireStaff,
  requireStaffPermission,
} from "@/lib/auth/require-staff";
import { bustPensionSettingsCache } from "@/lib/cache/revalidate-settings";
import { revalidateAfterFactoryReset } from "@/lib/cache/revalidate-admin";
import {
  updateTeamPermissions,
  TEAM_PERMISSIONS_MIGRATION_ERROR,
} from "@/services/pension-settings";
import {
  parseTeamPermissions,
  teamPermissionsToJson,
} from "@/domain/settings/team-permissions";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { runFactoryReset } from "@/services/database-reset";
import { updateStaffPasswordByEmail } from "@/services/staff-accounts";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getTranslations } from "next-intl/server";

export async function updateTeamPermissionsAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getTranslations("admin.serverActions");
  const { memberRole } = await requireStaff();
  if (memberRole !== "owner") {
    return { ok: false, error: t("roleForbidden") };
  }

  let parsed: ReturnType<typeof parseTeamPermissions>;
  try {
    parsed = parseTeamPermissions(
      JSON.parse(String(formData.get("team_permissions") ?? "{}")),
    );
  } catch {
    return { ok: false, error: t("genericError") };
  }

  try {
    await updateTeamPermissions(teamPermissionsToJson(parsed));
    await logAdminActivityFromSession({
      action: "settings.team_permissions_updated",
      entityType: "settings",
      summary: "Team permissions updated",
    });
    bustPensionSettingsCache(await resolveTenantIdForData());
    revalidatePath("/admin/settings/team-permissions");
    return { ok: true };
  } catch (e) {
    if (
      e instanceof Error &&
      e.message === TEAM_PERMISSIONS_MIGRATION_ERROR
    ) {
      return { ok: false, error: t("genericError") };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("genericError"),
    };
  }
}

function mapStaffPasswordError(
  message: string,
  t: Awaited<ReturnType<typeof getTranslations<"admin.serverActions">>>
): string {
  switch (message) {
    case "staff.password_min_8_chars":
      return t("staffPasswordMin8");
    case "staff.unknown_account":
      return t("staffUnknownAccount");
    case "staff.account_missing_in_supabase_run_setup_staff":
      return t("staffAccountMissingAuth");
    default:
      return message;
  }
}

export async function changeStaffPasswordAction(formData: FormData) {
  const staff_email = String(formData.get("staff_email") ?? "");
  const new_password = String(formData.get("new_password") ?? "");
  const confirm_password = String(formData.get("confirm_password") ?? "");

  const t = await getTranslations("admin.serverActions");
  try {
    await requireStaffPermission("team_admin");
  } catch {
    return { error: t("roleForbidden") };
  }

  const tenant = await resolveRequestTenant();

  if (new_password !== confirm_password) {
    return { error: t("passwordsDoNotMatch") };
  }
  if (!tenant) {
    return { error: t("tenantNotResolved") };
  }

  try {
    await updateStaffPasswordByEmail(
      staff_email,
      new_password,
      tenant.id
    );
  } catch (e) {
    const raw = e instanceof Error ? e.message : t("changePasswordError");
    return {
      error: mapStaffPasswordError(raw, t),
    };
  }

  await logAdminActivityFromSession({
    action: "staff.password_changed",
    entityType: "staff",
    summary: `Staff password changed: ${staff_email}`,
    metadata: { staff_email },
  });

  return { ok: true as const };
}

export async function factoryResetAction(confirmText: string): Promise<void> {
  const t = await getTranslations("admin.serverActions");
  const { memberRole } = await requireStaff();
  if (memberRole !== "owner") {
    throw new Error(t("roleForbidden"));
  }

  if (confirmText !== "RESET") {
    throw new Error(t("typeResetExactly"));
  }

  try {
    await runFactoryReset();
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "factory_reset.disabled_set_admin_factory_reset_enabled_true") {
        throw new Error(t("factoryResetDisabled"));
      }
      if (
        e.message ===
        "factory_reset.rpc_admin_factory_reset_for_tenant_missing_run_migration_042"
      ) {
        throw new Error(t("factoryResetMigration042"));
      }
    }
    throw e;
  }

  revalidateAfterFactoryReset();
  await redirect("/admin/settings/security?reset=1");
}
