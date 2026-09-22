"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { parsePublicSiteSettingsInput } from "@/domain/settings/schemas/public-site";
import { requireStaffPermission } from "@/lib/auth/require-staff";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { upsertPublicSiteSettingsImpl } from "@/services/public-site/mutations";
import { getTranslations } from "next-intl/server";

export async function savePublicSiteSettingsAction(
  input: unknown,
): Promise<
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
> {
  try {
    const [t] = await Promise.all([
      getTranslations("admin.serverActions"),
      requireStaffPermission("pension_settings"),
    ]);

    const tenant = await resolveRequestTenant();
    if (!tenant) {
      return { ok: false, error: t("tenantNotResolved") };
    }

    const parsed = parsePublicSiteSettingsInput(input);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };
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
      summary: `Public site: ${parsed.data.templateId} / ${parsed.data.themeId}`,
      metadata: {
        templateId: parsed.data.templateId,
        themeId: parsed.data.themeId,
        published: parsed.data.published,
      },
    });

    return { ok: true, redirectTo: "/admin/settings/public-site?saved=1" };
  } catch (error) {
    const t = await getTranslations("admin.serverActions");
    const message = error instanceof Error ? error.message : "";
    if (
      message === "auth.permission_forbidden" ||
      message === "auth.role_forbidden" ||
      message === "auth.tenant_member_required"
    ) {
      return { ok: false, error: t("roleForbidden") };
    }
    return { ok: false, error: message || t("genericError") };
  }
}

function publicSiteMediaError(
  t: Awaited<ReturnType<typeof getTranslations<"admin.serverActions">>>,
  reason: string,
): string {
  if (reason === "tooLarge") return t("publicSiteMediaTooLarge");
  if (reason === "type" || reason === "kind") return t("publicSiteMediaType");
  if (reason === "empty") return t("publicSiteMediaEmpty");
  return t("publicSiteMediaFailed");
}

export async function uploadPublicSiteImageAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const [t] = await Promise.all([
      getTranslations("admin.serverActions"),
      requireStaffPermission("pension_settings"),
    ]);

    const tenant = await resolveRequestTenant();
    if (!tenant) {
      return { ok: false, error: t("tenantNotResolved") };
    }

    const kind = String(formData.get("kind") ?? "");
    const file = formData.get("file");
    if (!(file instanceof Blob) || file.size === 0) {
      return { ok: false, error: t("publicSiteMediaEmpty") };
    }

    const { uploadPublicSiteImage } = await import("@/services/public-site/media");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await uploadPublicSiteImage({
      tenantId: tenant.id,
      kind,
      bytes,
    });

    if (!result.ok) {
      return { ok: false, error: publicSiteMediaError(t, result.reason) };
    }

    return { ok: true, url: result.url };
  } catch (error) {
    const t = await getTranslations("admin.serverActions");
    const message = error instanceof Error ? error.message : "";
    if (
      message === "auth.permission_forbidden" ||
      message === "auth.role_forbidden" ||
      message === "auth.tenant_member_required"
    ) {
      return { ok: false, error: t("roleForbidden") };
    }
    return { ok: false, error: message || t("genericError") };
  }
}
