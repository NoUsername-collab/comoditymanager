"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { parseGuestAppSettingsInput } from "@/domain/settings/schemas/guest-app";
import { upsertGuestAppSettingsImpl } from "@/services/guest-app/mutations";
import { requireStaffPermission } from "@/lib/auth/require-staff";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { getTranslations } from "next-intl/server";

export async function saveGuestAppSettingsAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const [t, staff] = await Promise.all([
      getTranslations("admin.serverActions"),
      requireStaffPermission("pension_settings"),
    ]);

    if (staff.role !== "admin") {
      return { ok: false, error: t("forbidden") };
    }

    const tenant = await resolveRequestTenant();
    if (!tenant) {
      return { ok: false, error: t("tenantNotResolved") };
    }

    const parsed = parseGuestAppSettingsInput(input);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    await upsertGuestAppSettingsImpl(tenant.id, parsed.data);

    revalidatePath("/admin/settings/guest-app");
    revalidatePath("/stay", "layout");

    await logAdminActivityFromSession({
      action: "settings.guest_app_updated",
      entityType: "settings",
      summary: "Guest app: setări actualizate",
      metadata: { enabled: parsed.data.enabled },
    });

    await redirect("/admin/settings/guest-app?saved=1");
    return { ok: true };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: message };
  }
}
