"use server";

import { revalidatePath } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import {
  requireStaff,
  requireStaffPermission,
} from "@/lib/auth/require-staff";
import { bustPensionSettingsCache } from "@/lib/cache/revalidate-settings";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import {
  updatePensionSettings,
  updateStatisticsVisibility,
  STATISTICS_VISIBILITY_MIGRATION_ERROR,
} from "@/services/pension-settings";
import { parseStatisticsVisibility } from "@/domain/settings/statistics-visibility";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { migrateLegacyPaletteKey } from "@/lib/themes";
import { getTranslations } from "next-intl/server";

export async function updateAppearanceSettingsAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const admin_palette_key = migrateLegacyPaletteKey(
    String(formData.get("admin_palette_key") ?? "noir")
  );
  const admin_day_night = String(formData.get("admin_day_night") ?? "night") as
    | "day"
    | "night";

  const [t, settings, pension] = await Promise.all([
    getTranslations("admin.serverActions"),
    requireStaffPermission("pension_settings"),
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
    summary: `Appearance: ${admin_palette_key} / ${admin_day_night}`,
    metadata: { admin_palette_key, admin_day_night, role: settings.role },
  });

  bustPensionSettingsCache(await resolveTenantIdForData());
  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/appearance");
  await redirect("/admin/settings/appearance?saved=1");
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
      summary: `Statistics visibility: ${visibility}`,
      metadata: { statistics_visibility: visibility },
    });
    bustPensionSettingsCache(await resolveTenantIdForData());
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
