"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import {
  clearAdminLocationUnlock,
  setAdminLocationUnlock,
} from "@/lib/auth/admin-config-session";
import { verifyLocationUnlockPassword } from "@/lib/auth/location-unlock";
import {
  requireLocationAdmin,
  requireStaff,
} from "@/lib/auth/require-staff";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { revalidateAfterFactoryReset } from "@/lib/cache/revalidate-admin";
import {
  updatePensionSettings,
  updateStatisticsVisibility,
  STATISTICS_VISIBILITY_MIGRATION_ERROR,
} from "@/services/pension-settings";
import { parseStatisticsVisibility } from "@/domain/settings/statistics-visibility";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { runFactoryReset } from "@/services/database-reset";
import { updateStaffPasswordByEmail } from "@/services/staff-accounts";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { getTranslations } from "next-intl/server";

export async function unlockLocationAdminAction(formData: FormData) {
  const [t, { user }] = await Promise.all([
    getTranslations("admin.serverActions"),
    requireStaff(),
  ]);
  const owner_password = String(formData.get("owner_password") ?? "");

  const ok = await verifyLocationUnlockPassword(owner_password, user);
  if (!ok) {
    return { error: t("ownerPasswordIncorrect") };
  }

  await setAdminLocationUnlock();
  await logAdminActivityFromSession({
    action: "location_admin.unlocked",
    entityType: "session",
    summary: t("locationAdminUnlocked"),
  });

  await redirect("/admin/settings/location?unlocked=1");
}

export async function lockLocationAdminAction() {
  const [t, { memberRole }] = await Promise.all([
    getTranslations("admin.serverActions"),
    requireStaff(),
  ]);
  await clearAdminLocationUnlock();
  await logAdminActivityFromSession({
    action: "location_admin.locked",
    entityType: "session",
    summary: t("locationAdminLocked"),
  });
  if (memberRole === "owner") {
    await redirect("/admin/settings/location?locked=1");
  }
  await redirect("/admin/settings?location=closed");
}

export async function updateAppearanceSettingsAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const admin_palette_key = String(formData.get("admin_palette_key") ?? "default");
  const admin_day_night = String(formData.get("admin_day_night") ?? "night") as
    | "day"
    | "night";

  const [t, settings, pension] = await Promise.all([
    getTranslations("admin.serverActions"),
    requireStaff(),
    import("@/services/pension-settings").then((m) => m.getPensionSettings()),
  ]);

  if (!id) throw new Error(t("settingsNotConfigured"));
  if (!pension) throw new Error(t("settingsMissing"));

  await updatePensionSettings(id, {
    display_name: pension.display_name,
    default_check_in_time: pension.default_check_in_time,
    default_check_out_time: pension.default_check_out_time,
    total_extra_beds_max: pension.total_extra_beds_max,
    admin_palette_source: "catalog",
    admin_palette_key,
    admin_day_night,
  });

  await logAdminActivityFromSession({
    action: "settings.appearance_updated",
    entityType: "settings",
    entityId: id,
    summary: `Aspect: ${admin_palette_key} / ${admin_day_night}`,
    metadata: { admin_palette_key, admin_day_night, role: settings.role },
  });

  revalidateTag(CACHE_TAGS.pensionSettings, "max");
  revalidatePath("/admin/settings");
  await redirect("/admin/settings?saved=1");
}

export async function updateStatisticsVisibilityAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getTranslations("admin.serverActions");
  const { memberRole } = await requireStaff();
  if (memberRole !== "owner") {
    return { ok: false, error: t("roleForbidden") };
  }

  const visibility = parseStatisticsVisibility(
    String(formData.get("statistics_visibility") ?? "owner")
  );

  try {
    await updateStatisticsVisibility(visibility);
    await logAdminActivityFromSession({
      action: "settings.updated",
      entityType: "settings",
      summary: `Statistici vizibile: ${visibility}`,
      metadata: { statistics_visibility: visibility },
    });
    revalidateTag(CACHE_TAGS.pensionSettings, "max");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/statistics");
    return { ok: true };
  } catch (e) {
    if (
      e instanceof Error &&
      e.message === STATISTICS_VISIBILITY_MIGRATION_ERROR
    ) {
      return { ok: false, error: t("statisticsVisibilityMigrationRequired") };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("genericError"),
    };
  }
}

export async function updateOperationalSettingsAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const display_name = String(formData.get("display_name") ?? "");
  const default_check_in_time = String(
    formData.get("default_check_in_time") ?? "14:00"
  );
  const default_check_out_time = String(
    formData.get("default_check_out_time") ?? "11:00"
  );
  const total_extra_beds_max = Number(formData.get("total_extra_beds_max") ?? 0);

  const [t, , pension] = await Promise.all([
    getTranslations("admin.serverActions"),
    requireLocationAdmin(),
    import("@/services/pension-settings").then((m) => m.getPensionSettings()),
  ]);

  if (!id) throw new Error(t("settingsNotConfigured"));
  if (!pension) throw new Error(t("settingsMissing"));

  await updatePensionSettings(id, {
    display_name,
    default_check_in_time,
    default_check_out_time,
    total_extra_beds_max,
    admin_palette_source: pension.admin_palette_source ?? "catalog",
    admin_palette_key: pension.admin_palette_key ?? "default",
    admin_day_night: pension.admin_day_night ?? "night",
  });

  await logAdminActivityFromSession({
    action: "settings.operational_updated",
    entityType: "settings",
    entityId: id,
    summary: `Operațional: ${display_name}`,
    metadata: {
      default_check_in_time,
      default_check_out_time,
      total_extra_beds_max,
    },
  });

  revalidateTag(CACHE_TAGS.pensionSettings, "max");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/location");
  await redirect("/admin/settings/location?saved=1");
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

  const [t, , tenant] = await Promise.all([
    getTranslations("admin.serverActions"),
    requireLocationAdmin(),
    resolveRequestTenant(),
  ]);

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
    summary: `Parolă schimbată: ${staff_email}`,
    metadata: { staff_email },
  });

  return { ok: true as const };
}

export async function factoryResetAction(confirmText: string): Promise<void> {
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();

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
  await redirect("/admin/settings/location?reset=1");
}

/** @deprecated — folosește updateAppearanceSettingsAction sau updateOperationalSettingsAction */
export async function updateSettingsAction(formData: FormData) {
  return updateOperationalSettingsAction(formData);
}
