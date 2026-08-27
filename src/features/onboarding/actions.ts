"use server";

import { revalidateTag, revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/auth/require-staff";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getPensionSettings,
  updatePensionSettings,
  updatePensionSettingsPartial,
} from "@/services/pension-settings";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { migrateLegacyPaletteKey } from "@/lib/themes";

export type OnboardingStep1Result =
  | { ok: true }
  | { ok: false; error: string };

export async function saveOnboardingStep1Action(
  formData: FormData
): Promise<OnboardingStep1Result> {
  const t = await getTranslations("admin.onboarding");
  try {
    await requireStaffPermission("pension_settings");
    const displayName = String(formData.get("display_name") ?? "").trim();
    const checkIn = String(formData.get("default_check_in_time") ?? "14:00");
    const checkOut = String(formData.get("default_check_out_time") ?? "12:00");

    if (!displayName || displayName.length < 2) {
      return { ok: false, error: t("genericError") };
    }

    await updatePensionSettingsPartial({
      display_name: displayName,
      default_check_in_time: checkIn,
      default_check_out_time: checkOut,
    });

    await logAdminActivityFromSession({
      action: "settings.updated",
      entityType: "settings",
      summary: `Onboarding step 1: ${displayName}`,
      metadata: { step: 1 },
    });

    revalidateTag(CACHE_TAGS.pensionSettings, "max");
    revalidatePath("/admin");
    return { ok: true };
  } catch {
    return { ok: false, error: t("genericError") };
  }
}

export type OnboardingStep3Result =
  | { ok: true }
  | { ok: false; error: string };

export async function saveOnboardingStep3Action(
  formData: FormData
): Promise<OnboardingStep3Result> {
  const t = await getTranslations("admin.onboarding");
  try {
    await requireStaffPermission("pension_settings");
    const pension = await getPensionSettings();
    if (!pension) return { ok: false, error: t("genericError") };

    const paletteKey = migrateLegacyPaletteKey(
      String(formData.get("admin_palette_key") ?? "noir")
    );
    const dayNight = String(formData.get("admin_day_night") ?? "night") as
      | "day"
      | "night";

    await updatePensionSettings(pension.id, {
      display_name: pension.display_name,
      default_check_in_time: pension.default_check_in_time,
      default_check_out_time: pension.default_check_out_time,
      total_extra_beds_max: pension.total_extra_beds_max,
      admin_palette_source: "catalog",
      admin_palette_key: paletteKey,
      admin_day_night: dayNight,
    });

    await logAdminActivityFromSession({
      action: "settings.appearance_updated",
      entityType: "settings",
      entityId: pension.id,
      summary: `Onboarding step 3: ${paletteKey} / ${dayNight}`,
      metadata: { step: 3, admin_palette_key: paletteKey, admin_day_night: dayNight },
    });

    revalidateTag(CACHE_TAGS.pensionSettings, "max");
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch {
    return { ok: false, error: t("genericError") };
  }
}
