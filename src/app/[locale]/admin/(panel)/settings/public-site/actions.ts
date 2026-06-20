"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { parsePublicSiteSettingsInput } from "@/domain/settings/schemas/public-site";
import { requireStaffPermission } from "@/lib/auth/require-staff";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { upsertPublicSiteSettingsImpl } from "@/services/public-site/mutations";
import { getTranslations } from "next-intl/server";

export async function savePublicSiteSettingsAction(
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

    const parsed = parsePublicSiteSettingsInput(input);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    await upsertPublicSiteSettingsImpl(tenant.id, parsed.data);

    revalidateTag(CACHE_TAGS.publicSite, "max");
    revalidateTag(tenantTag(tenant.id, CACHE_TAGS.publicSite), "max");
    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/admin/settings/public-site");

    await logAdminActivityFromSession({
      action: "settings.public_site_updated",
      entityType: "settings",
      summary: `Site public: ${parsed.data.templateId} / ${parsed.data.themeId}`,
      metadata: {
        templateId: parsed.data.templateId,
        themeId: parsed.data.themeId,
        published: parsed.data.published,
      },
    });

    await redirect("/admin/settings/public-site?saved=1");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: message };
  }
}
