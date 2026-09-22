"use server";

import { revalidateTag } from "next/cache";
import { requireStaffPermission } from "@/lib/auth/require-admin";
import { bustPensionSettingsCache } from "@/lib/cache/revalidate-settings";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { getTranslations } from "next-intl/server";
import { isCheckinMigrationMissing } from "@/lib/checkin/migration";
import {
  updateCheckinSettings,
  checkinSettingsCacheTag,
} from "@/services/checkin/settings";

export async function updateCheckinSettingsAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const t = await getTranslations("admin.serverActions");

  try {
    await requireStaffPermission("pension_settings");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "auth.role_forbidden";
    if (msg === "auth.login_required") {
      return { ok: false, error: t("invalidUserOrPassword") };
    }
    if (msg === "auth.tenant_member_required" || msg === "auth.role_forbidden" || msg === "auth.permission_forbidden") {
      return { ok: false, error: t("roleForbidden") };
    }
    return { ok: false, error: msg };
  }

  try {
    const input: Record<string, unknown> = {};

    const fields = [
      "checkin_doc_rule",
      "checkin_phone_rule",
      "checkin_cnp_rule",
      "checkin_payment_rule",
      "group_checkin_mode",
      "checkin_key_rule",
      "checkin_ids_per_room",
    ];

    for (const f of fields) {
      const v = formData.get(f);
      if (v == null) continue;
      input[f] = String(v).trim();
    }

    const intFields = ["checkin_min_payment_pct"];
    for (const f of intFields) {
      const v = formData.get(f);
      if (v != null) input[f] = Number(v);
    }

    const numFields = [
      "checkin_deposit_amount",
      "late_checkout_fee",
      "early_checkin_fee",
      "early_checkout_fee",
    ];
    for (const f of numFields) {
      const v = formData.get(f);
      if (v != null) input[f] = Number(v);
    }

    const boolFields = [
      "checkin_deposit",
      "walkin_allowed",
      "late_checkout_allowed",
      "checkout_block_unpaid",
      "early_checkin_allowed",
      "early_checkout_allowed",
      "allow_post_checkout_edits",
    ];
    for (const f of boolFields) {
      const v = formData.get(f);
      if (v != null) input[f] = v === "true";
    }

    await updateCheckinSettings(input);

    await logAdminActivityFromSession({
      action: "settings.updated",
      entityType: "settings",
      summary: "Check-in settings updated",
      metadata: { section: "checkin", ...input },
    });

    const tenantId = await resolveTenantIdForData();
    bustPensionSettingsCache(tenantId);
    revalidateTag(checkinSettingsCacheTag(tenantId), "max");

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (isCheckinMigrationMissing(msg)) {
      const t = await getTranslations("admin.checkIn");
      return { ok: false, error: t("migrationRequired") };
    }
    if (msg === "settings.pension_settings_missing") {
      const t = await getTranslations("admin.pages.settings.checkin");
      return { ok: false, error: t("saveMissingRow") };
    }
    return { ok: false, error: msg };
  }
}
