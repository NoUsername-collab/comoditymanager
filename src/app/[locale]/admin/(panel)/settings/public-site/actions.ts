"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import type { PublicSiteSettingsInput } from "@/features/public-site/domain/types";
import { requireStaff } from "@/lib/auth/require-staff";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { upsertPublicSiteSettingsImpl } from "@/services/public-site/mutations";
import { getTranslations } from "next-intl/server";

export async function savePublicSiteSettingsAction(
  input: PublicSiteSettingsInput
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

    await upsertPublicSiteSettingsImpl(tenant.id, input);

    revalidateTag(CACHE_TAGS.publicSite, "max");
    revalidateTag(tenantTag(tenant.id, CACHE_TAGS.publicSite), "max");
    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/admin/settings/public-site");

    await logAdminActivityFromSession({
      action: "settings.public_site_updated",
      entityType: "settings",
      summary: `Site public: ${input.templateId} / ${input.themeId}`,
      metadata: {
        templateId: input.templateId,
        themeId: input.themeId,
        published: input.published,
      },
    });

    await redirect("/admin/settings/public-site?saved=1");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: message };
  }
}
