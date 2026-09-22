"use server";

import { revalidateTag } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { bustPensionSettingsCache } from "@/lib/cache/revalidate-settings";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { updatePensionSettingsPartial } from "@/services/pension-settings";
import { updateTenantFiscalSettings } from "@/services/tenant-fiscal-settings";
import { checkinSettingsCacheTag } from "@/services/checkin/settings";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { getTranslations } from "next-intl/server";

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

  if (memberRole !== "owner") {
    return { ok: false, error: t("roleForbidden") };
  }

  const atomicUpdate: Record<string, unknown> = {};

  if (formData.has("invoice_series")) {
    atomicUpdate.invoice_series = String(formData.get("invoice_series") ?? "HSP")
      .trim()
      .slice(0, 12);
  }
  if (formData.has("invoice_seller_reg_com")) {
    const raw = String(formData.get("invoice_seller_reg_com") ?? "").trim();
    atomicUpdate.invoice_seller_reg_com = raw || null;
  }
  if (formData.has("invoice_vat_enabled")) {
    atomicUpdate.invoice_vat_enabled =
      String(formData.get("invoice_vat_enabled")) === "true";
  }
  if (formData.has("invoice_vat_rate")) {
    const raw = String(formData.get("invoice_vat_rate") ?? "").trim();
    atomicUpdate.invoice_vat_rate = raw ? Number(raw) : null;
  }
  if (formData.has("invoice_prices_include_vat")) {
    atomicUpdate.invoice_prices_include_vat =
      String(formData.get("invoice_prices_include_vat")) === "true";
  }

  for (const key of [
    "fisa_property_address",
    "fisa_owner_cui",
    "fisa_tourism_license",
  ] as const) {
    if (formData.has(key)) {
      const raw = String(formData.get(key) ?? "").trim();
      atomicUpdate[key] = raw || null;
    }
  }

  try {
    if (Object.keys(atomicUpdate).length > 0) {
      await updatePensionSettingsPartial(atomicUpdate);
    }

    const fiscalUpdate: {
      provider?: "internal_pdf" | "anaf";
      anafEnabled?: boolean;
      anafCif?: string | null;
      anafEnv?: "test" | "prod";
    } = {};

    if (formData.has("fiscal_provider")) {
      const raw = String(formData.get("fiscal_provider") ?? "internal_pdf");
      fiscalUpdate.provider = raw === "anaf" ? "anaf" : "internal_pdf";
    }
    if (formData.has("anaf_enabled")) {
      fiscalUpdate.anafEnabled = String(formData.get("anaf_enabled")) === "true";
    }
    if (formData.has("anaf_env")) {
      const raw = String(formData.get("anaf_env") ?? "test");
      fiscalUpdate.anafEnv = raw === "prod" ? "prod" : "test";
    }
    if (formData.has("anaf_cif")) {
      const raw = String(formData.get("anaf_cif") ?? "").trim();
      fiscalUpdate.anafCif = raw || null;
    }

    if (Object.keys(fiscalUpdate).length > 0) {
      await updateTenantFiscalSettings(fiscalUpdate);
    }

    await logAdminActivityFromSession({
      action: "settings.updated",
      entityType: "settings",
      summary: "Fiscal and billing settings updated",
      metadata: { section: "fiscal" },
    });
    const tenantId = await resolveTenantIdForData();
    bustPensionSettingsCache(tenantId);
    revalidateTag(checkinSettingsCacheTag(tenantId), "max");
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "fiscal.settings_migration_required") {
      return { ok: false, error: t("bookingRulesMigrationRequired") };
    }
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
