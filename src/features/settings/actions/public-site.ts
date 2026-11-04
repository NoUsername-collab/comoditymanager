"use server";

import { refresh, revalidatePath, updateTag } from "next/cache";
import { parsePublicSiteSettingsInput } from "@/domain/settings/schemas/public-site";
import { requireStaffPermission } from "@/lib/auth/require-staff";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { logAdminActivityFromSession } from "@/services/activity-log";
import {
  PublicSiteVersionConflictError,
  upsertPublicSiteSettingsImpl,
} from "@/services/public-site/mutations";
import { getPublicSiteConfigForAdmin } from "@/services/public-site/queries";
import { getTranslations } from "next-intl/server";
import { settingsActionErrorMessage } from "@/lib/settings/action-error";

/**
 * `expectedVersion` is the version the editor loaded. When someone saved in the
 * meantime the save is refused with `conflict`, instead of overwriting their work.
 */
export async function savePublicSiteSettingsAction(
  input: unknown,
  expectedVersion: number | null,
): Promise<
  | { ok: true; redirectTo: string; version: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; conflict?: true }
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

    // Visibility before this save, so going online or offline gets its own history entry.
    const wasPublished = (await getPublicSiteConfigForAdmin()).published;

    const version = await upsertPublicSiteSettingsImpl(
      tenant.id,
      parsed.data,
      Number.isInteger(expectedVersion) ? expectedVersion : null,
    );

    updateTag(CACHE_TAGS.publicSite);
    updateTag(tenantTag(tenant.id, CACHE_TAGS.publicSite));
    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/admin/settings/public-site");
    refresh();

    const visibilityChanged = wasPublished !== parsed.data.published;
    await logAdminActivityFromSession({
      action: !visibilityChanged
        ? "settings.public_site_updated"
        : parsed.data.published
          ? "settings.public_site_published"
          : "settings.public_site_hidden",
      entityType: "settings",
      summary: `Public site: ${parsed.data.templateId} / ${parsed.data.themeId}`,
      metadata: {
        templateId: parsed.data.templateId,
        themeId: parsed.data.themeId,
        published: parsed.data.published,
      },
    });

    return { ok: true, redirectTo: "/admin/settings/public-site?saved=1", version };
  } catch (error) {
    const t = await getTranslations("admin.serverActions");
    if (error instanceof PublicSiteVersionConflictError) {
      return { ok: false, error: t("publicSiteVersionConflict"), conflict: true };
    }
    return { ok: false, error: settingsActionErrorMessage(error, t) };
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
    return { ok: false, error: settingsActionErrorMessage(error, t) };
  }
}
