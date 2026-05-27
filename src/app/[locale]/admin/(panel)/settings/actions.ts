"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import {
  clearAdminLocationUnlock,
  setAdminLocationUnlock,
  verifyAdminPassword,
} from "@/lib/auth/admin-config-session";
import {
  requireLocationAdmin,
  requireStaff,
} from "@/lib/auth/require-staff";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { updatePensionSettings } from "@/services/pension-settings";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { runFactoryReset } from "@/services/database-reset";
import { updateStaffPasswordByEmail } from "@/services/staff-accounts";
import { getTranslations } from "next-intl/server";

export async function unlockLocationAdminAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireStaff();
  const admin_password = String(formData.get("admin_password") ?? "");

  const ok = await verifyAdminPassword(admin_password);
  if (!ok) {
    return { error: t("adminPasswordIncorrect") };
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
  const t = await getTranslations("admin.serverActions");
  await requireStaff();
  await clearAdminLocationUnlock();
  await logAdminActivityFromSession({
    action: "location_admin.locked",
    entityType: "session",
    summary: t("locationAdminLocked"),
  });
  await redirect("/admin/settings?location=closed");
}

export async function updateAppearanceSettingsAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  const id = String(formData.get("id") ?? "");
  const admin_palette_key = String(formData.get("admin_palette_key") ?? "default");
  const admin_day_night = String(formData.get("admin_day_night") ?? "night") as
    | "day"
    | "night";

  if (!id) throw new Error(t("settingsNotConfigured"));

  const settings = await requireStaff();
  const pension = await import("@/services/pension-settings").then((m) =>
    m.getPensionSettings()
  );
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
  revalidatePath("/");
  await redirect("/admin/settings?saved=1");
}

export async function updateOperationalSettingsAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();

  const id = String(formData.get("id") ?? "");
  const display_name = String(formData.get("display_name") ?? "");
  const default_check_in_time = String(
    formData.get("default_check_in_time") ?? "14:00"
  );
  const default_check_out_time = String(
    formData.get("default_check_out_time") ?? "11:00"
  );
  const total_extra_beds_max = Number(formData.get("total_extra_beds_max") ?? 0);

  if (!id) throw new Error(t("settingsNotConfigured"));

  const pension = await import("@/services/pension-settings").then((m) =>
    m.getPensionSettings()
  );
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
  revalidatePath("/");
  await redirect("/admin/settings/location?saved=1");
}

export async function changeStaffPasswordAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();

  const staff_email = String(formData.get("staff_email") ?? "");
  const new_password = String(formData.get("new_password") ?? "");
  const confirm_password = String(formData.get("confirm_password") ?? "");

  if (new_password !== confirm_password) {
    return { error: t("passwordsDoNotMatch") };
  }

  try {
    await updateStaffPasswordByEmail(staff_email, new_password);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : t("changePasswordError"),
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

  await runFactoryReset();

  revalidateTag(CACHE_TAGS.pensionSettings, "max");
  revalidateTag(CACHE_TAGS.buildings, "max");
  revalidateTag(CACHE_TAGS.rooms, "max");
  revalidateTag(CACHE_TAGS.roomCatalog, "max");
  revalidateTag(CACHE_TAGS.roomOptionsByRoom, "max");
  revalidateTag(CACHE_TAGS.bookingCounts, "max");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/location");
  revalidatePath("/admin/buildings");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/bookings");
  await redirect("/admin/settings/location?reset=1");
}

/** @deprecated — folosește updateAppearanceSettingsAction sau updateOperationalSettingsAction */
export async function updateSettingsAction(formData: FormData) {
  return updateOperationalSettingsAction(formData);
}
