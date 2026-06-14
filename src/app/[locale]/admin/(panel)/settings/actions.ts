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
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { revalidateAfterFactoryReset } from "@/lib/cache/revalidate-admin";
import {
  updatePensionSettings,
  updateStatisticsVisibility,
  STATISTICS_VISIBILITY_MIGRATION_ERROR,
} from "@/services/pension-settings";
import { parseStatisticsVisibility } from "@/domain/settings/statistics-visibility";
import {
  parsePricingSeasons,
  type CancellationPolicyType,
  type WeekendPricingMode,
} from "@/domain/settings/booking-rules";
import { updateBookingRulesSettings } from "@/services/booking-rules-settings";
import { updateCheckinSettings, checkinSettingsCacheTag } from "@/services/checkin/settings";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { runFactoryReset } from "@/services/database-reset";
import { updateStaffPasswordByEmail } from "@/services/staff-accounts";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { migrateLegacyPaletteKey } from "@/lib/themes";
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
  const admin_palette_key = migrateLegacyPaletteKey(
    String(formData.get("admin_palette_key") ?? "noir")
  );
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
    admin_palette_key: migrateLegacyPaletteKey(pension.admin_palette_key ?? "noir"),
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

export async function updateBookingRulesSettingsAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getTranslations("admin.serverActions");
  const { memberRole } = await requireStaff();
  if (memberRole !== "owner" && memberRole !== "admin") {
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
  if (formData.has("invoice_series")) {
    partial.invoiceSeries = String(formData.get("invoice_series") ?? "HSP")
      .trim()
      .slice(0, 12);
  }
  if (formData.has("invoice_seller_reg_com")) {
    const raw = String(formData.get("invoice_seller_reg_com") ?? "").trim();
    partial.invoiceSellerRegCom = raw || null;
  }

  try {
    await updateBookingRulesSettings(partial);
    await logAdminActivityFromSession({
      action: "settings.booking_rules_updated",
      entityType: "settings",
      summary: "Reguli rezervare / prețuri actualizate",
    });
    revalidateTag(CACHE_TAGS.pensionSettings, "max");
    revalidatePath("/admin/settings");
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

export async function updateFiscalBillingSettingsAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getTranslations("admin.serverActions");

  let memberRole: "owner" | "admin" | "operator" | null = null;
  try {
    ({ memberRole } = await requireStaff());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "auth.role_forbidden";
    if (msg === "auth.login_required") {
      return { ok: false, error: t("invalidUserOrPassword") };
    }
    return { ok: false, error: t("roleForbidden") };
  }

  if (memberRole !== "owner" && memberRole !== "admin") {
    return { ok: false, error: t("roleForbidden") };
  }

  const bookingPartial: Parameters<typeof updateBookingRulesSettings>[0] = {};
  const checkinPartial: Parameters<typeof updateCheckinSettings>[0] = {};

  if (formData.has("invoice_series")) {
    bookingPartial.invoiceSeries = String(formData.get("invoice_series") ?? "HSP")
      .trim()
      .slice(0, 12);
  }
  if (formData.has("invoice_seller_reg_com")) {
    const raw = String(formData.get("invoice_seller_reg_com") ?? "").trim();
    bookingPartial.invoiceSellerRegCom = raw || null;
  }
  if (formData.has("invoice_vat_enabled")) {
    bookingPartial.invoiceVatEnabled =
      String(formData.get("invoice_vat_enabled")) === "true";
  }
  if (formData.has("invoice_vat_rate")) {
    const raw = String(formData.get("invoice_vat_rate") ?? "").trim();
    bookingPartial.invoiceVatRate = raw ? Number(raw) : null;
  }
  if (formData.has("invoice_prices_include_vat")) {
    bookingPartial.invoicePricesIncludeVat =
      String(formData.get("invoice_prices_include_vat")) === "true";
  }

  for (const key of [
    "fisa_property_address",
    "fisa_owner_cui",
    "fisa_tourism_license",
  ] as const) {
    if (formData.has(key)) {
      const raw = String(formData.get(key) ?? "").trim();
      checkinPartial[key] = raw || null;
    }
  }

  try {
    if (Object.keys(bookingPartial).length > 0) {
      await updateBookingRulesSettings(bookingPartial);
    }
    if (Object.keys(checkinPartial).length > 0) {
      await updateCheckinSettings(checkinPartial);
    }
    await logAdminActivityFromSession({
      action: "settings.updated",
      entityType: "settings",
      summary: "Setări fiscale / facturare actualizate",
      metadata: { section: "fiscal" },
    });
    const tenantId = await resolveTenantIdForData();
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.pensionSettings), "max");
    revalidateTag(CACHE_TAGS.pensionSettings, "max");
    revalidateTag(checkinSettingsCacheTag(tenantId), "max");
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message === "settings.booking_rules_migration_required" ||
        e.message === "checkin.migration_required")
    ) {
      return { ok: false, error: t("bookingRulesMigrationRequired") };
    }
    if (e instanceof Error && e.message === "settings.pension_settings_missing") {
      const tFiscal = await getTranslations("admin.pages.settings.fiscal");
      return { ok: false, error: tFiscal("saveMissingRow") };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("genericError"),
    };
  }
}

/** @deprecated — folosește updateAppearanceSettingsAction sau updateOperationalSettingsAction */
export async function updateSettingsAction(formData: FormData) {
  return updateOperationalSettingsAction(formData);
}
