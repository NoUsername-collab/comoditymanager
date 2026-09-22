"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import {
  clearAdminLocationUnlock,
  setAdminLocationUnlock,
} from "@/lib/auth/admin-config-session";
import { verifyLocationUnlockPassword } from "@/lib/auth/location-unlock";
import { parseOperationalHours } from "@/domain/settings/operational-hours";
import { requireStaff, requireStaffPermission } from "@/lib/auth/require-staff";
import { checkRateLimit, getClientIp, RATE_LIMIT_PASSWORD_VERIFY } from "@/lib/rate-limit";
import { bustPensionSettingsCache } from "@/lib/cache/revalidate-settings";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { updatePensionSettings } from "@/services/pension-settings";
import {
  parsePricingSeasons,
  type CancellationPolicyType,
  type WeekendPricingMode,
} from "@/domain/settings/booking-rules";
import { updateBookingRulesSettings } from "@/services/booking-rules-settings";
import { checkinSettingsCacheTag } from "@/services/checkin/settings";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { migrateLegacyPaletteKey } from "@/lib/themes";
import { getTranslations } from "next-intl/server";

export async function unlockLocationAdminAction(formData: FormData) {
  const [t, { user }, ip] = await Promise.all([
    getTranslations("admin.serverActions"),
    requireStaff(),
    getClientIp(),
  ]);

  const rl = checkRateLimit(`pwd:${ip}`, RATE_LIMIT_PASSWORD_VERIFY.limit, RATE_LIMIT_PASSWORD_VERIFY.windowMs);
  if (!rl.allowed) {
    return { error: t("ownerPasswordIncorrect") };
  }

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

export async function updateOperationalSettingsAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsedHours = parseOperationalHours({
    checkInTime: String(formData.get("default_check_in_time") ?? ""),
    checkOutTime: String(formData.get("default_check_out_time") ?? ""),
    extraBedsMax: Number(formData.get("total_extra_beds_max") ?? 0),
  });

  const [t, , pension] = await Promise.all([
    getTranslations("admin.serverActions"),
    requireStaffPermission("pension_settings"),
    import("@/services/pension-settings").then((m) => m.getPensionSettings()),
  ]);

  if (!parsedHours.ok) {
    if (parsedHours.error === "settings.checkout_must_be_before_checkin") {
      throw new Error(t("checkoutMustBeBeforeCheckin"));
    }
    if (parsedHours.error === "settings.invalid_extra_beds") {
      throw new Error(t("invalidExtraBeds"));
    }
    throw new Error(t("invalidStayHours"));
  }

  if (!id) throw new Error(t("settingsNotConfigured"));
  if (!pension) throw new Error(t("settingsMissing"));

  await updatePensionSettings(id, {
    display_name: pension.display_name,
    default_check_in_time: parsedHours.data.checkInTime,
    default_check_out_time: parsedHours.data.checkOutTime,
    total_extra_beds_max: parsedHours.data.extraBedsMax,
    admin_palette_source: pension.admin_palette_source ?? "catalog",
    admin_palette_key: migrateLegacyPaletteKey(pension.admin_palette_key ?? "noir"),
    admin_day_night: pension.admin_day_night ?? "night",
  });

  await logAdminActivityFromSession({
    action: "settings.operational_updated",
    entityType: "settings",
    entityId: id,
    summary: "Operational hours and extra-bed cap updated",
    metadata: {
      default_check_in_time: parsedHours.data.checkInTime,
      default_check_out_time: parsedHours.data.checkOutTime,
      total_extra_beds_max: parsedHours.data.extraBedsMax,
    },
  });

  const tenantId = await resolveTenantIdForData();
  bustPensionSettingsCache(tenantId);
  revalidateTag(checkinSettingsCacheTag(tenantId), "max");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/identity");
  await redirect("/admin/settings/identity?saved=1");
}

export async function updatePensionIdentityAction(
  input: import("@/services/pension-identity").PensionIdentityInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getTranslations("admin.serverActions");
  try {
    await requireStaffPermission("pension_settings");
  } catch {
    return { ok: false, error: t("roleForbidden") };
  }

  try {
    const { updatePensionIdentity } = await import("@/services/pension-identity");
    await updatePensionIdentity(input);
    await logAdminActivityFromSession({
      action: "settings.updated",
      entityType: "settings",
      summary: "Property identity updated",
      metadata: { displayName: input.displayName },
    });
    bustPensionSettingsCache(await resolveTenantIdForData());
    revalidatePath("/admin/settings/identity");
    revalidatePath("/admin/settings");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "settings.identity_migration_required") {
      return { ok: false, error: t("genericError") };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("genericError"),
    };
  }
}

export async function updateBookingRulesSettingsAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getTranslations("admin.serverActions");
  try {
    await requireStaffPermission("pension_settings");
  } catch {
    return { ok: false, error: t("roleForbidden") };
  }

  const type = String(formData.get("cancellation_policy_type") ?? "");
  const partial: Parameters<typeof updateBookingRulesSettings>[0] = {};

  if (type) {
    partial.cancellationPolicyType = type as CancellationPolicyType;
  }
  if (formData.has("cancellation_policy_days")) {
    partial.cancellationPolicyDays = Math.min(
      90,
      Math.max(0, Number(formData.get("cancellation_policy_days") ?? 0))
    );
  }
  if (formData.has("cancellation_policy_custom_text")) {
    const raw = String(formData.get("cancellation_policy_custom_text") ?? "").trim();
    partial.cancellationPolicyCustomText = raw || null;
  }
  if (formData.has("pricing_weekend_enabled")) {
    partial.pricingWeekendEnabled =
      String(formData.get("pricing_weekend_enabled")) === "1";
  }
  if (formData.has("pricing_weekend_mode")) {
    partial.pricingWeekendMode = String(
      formData.get("pricing_weekend_mode")
    ) as WeekendPricingMode;
  }
  if (formData.has("pricing_weekend_multiplier")) {
    partial.pricingWeekendMultiplier = Math.min(
      5,
      Math.max(1, Number(formData.get("pricing_weekend_multiplier")) || 1)
    );
  }
  if (formData.has("pricing_seasons")) {
    try {
      partial.pricingSeasons = parsePricingSeasons(
        JSON.parse(String(formData.get("pricing_seasons") ?? "[]"))
      );
    } catch {
      return { ok: false, error: t("genericError") };
    }
  }

  try {
    await updateBookingRulesSettings(partial);
    await logAdminActivityFromSession({
      action: "settings.booking_rules_updated",
      entityType: "settings",
      summary: "Booking and pricing rules updated",
    });
    bustPensionSettingsCache(await resolveTenantIdForData());
    revalidatePath("/termeni");
    return { ok: true };
  } catch (e) {
    if (
      e instanceof Error &&
      e.message === "settings.booking_rules_migration_required"
    ) {
      return { ok: false, error: t("bookingRulesMigrationRequired") };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("genericError"),
    };
  }
}

/** @deprecated Use updateAppearanceSettingsAction or updateOperationalSettingsAction */
export async function updateSettingsAction(formData: FormData) {
  return updateOperationalSettingsAction(formData);
}
