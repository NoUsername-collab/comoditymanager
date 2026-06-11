"use server";

import { revalidatePath } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import type { GuestAppSettingsInput } from "@/services/guest-app/mutations";
import { upsertGuestAppSettingsImpl } from "@/services/guest-app/mutations";
import { requireStaff } from "@/lib/auth/require-staff";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { getTranslations } from "next-intl/server";

export async function saveGuestAppSettingsAction(
  input: GuestAppSettingsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const [t, staff] = await Promise.all([
      getTranslations("admin.serverActions"),
      requireStaff(),
    ]);

    if (staff.memberRole !== "owner" && staff.role !== "admin") {
      return { ok: false, error: t("forbidden") };
    }

    const tenant = await resolveRequestTenant();
    if (!tenant) {
      return { ok: false, error: t("tenantNotResolved") };
    }

    await upsertGuestAppSettingsImpl(tenant.id, input);

    revalidatePath("/admin/settings/guest-app");
    revalidatePath("/stay", "layout");

    await logAdminActivityFromSession({
      action: "settings.guest_app_updated",
      entityType: "settings",
      summary: "Guest app: setări actualizate",
      metadata: { enabled: input.enabled },
    });

    await redirect("/admin/settings/guest-app?saved=1");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: message };
  }
}
