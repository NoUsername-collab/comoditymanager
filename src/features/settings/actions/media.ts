"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/auth/require-staff";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { isMediaAlbum, type MediaAsset, type MediaText } from "@/domain/media/types";

type Result<T = undefined> = ({ ok: true } & (T extends undefined ? object : { value: T })) | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function guard() {
  const t = await getTranslations("admin.serverActions");
  try {
    await requireStaffPermission("pension_settings");
  } catch {
    return { t, error: t("roleForbidden") };
  }
  const tenant = await resolveRequestTenant();
  if (!tenant) return { t, error: t("tenantNotResolved") };
  return { t, tenantId: tenant.id };
}

/** Everything that shows library photos reads them fresh after a change. */
function refreshAfterChange(tenantId: string) {
  updateTag(CACHE_TAGS.media);
  updateTag(tenantTag(tenantId, CACHE_TAGS.media));
  updateTag(tenantTag(tenantId, CACHE_TAGS.publicSite));
  revalidatePath("/admin/settings/photos");
  revalidatePath("/admin/settings/location/setup");
}

function roomTypeOrNull(raw: unknown): string | null | "invalid" {
  if (raw === null || raw === undefined || raw === "") return null;
  return typeof raw === "string" && UUID.test(raw) ? raw : "invalid";
}

/** Upload one photo into the library, in an album and optionally under a room type. */
export async function uploadMediaAction(formData: FormData): Promise<Result<MediaAsset>> {
  const g = await guard();
  if (!("tenantId" in g) || !g.tenantId) return { ok: false, error: g.error! };
  const { t, tenantId } = g;

  const album = String(formData.get("album") ?? "other");
  const roomTypeId = roomTypeOrNull(formData.get("roomTypeId"));
  if (!isMediaAlbum(album) || roomTypeId === "invalid") return { ok: false, error: t("mediaInvalid") };
  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: t("publicSiteMediaEmpty") };

  const { uploadPublicSiteImage } = await import("@/services/public-site/media");
  const uploaded = await uploadPublicSiteImage({
    tenantId,
    kind: "library",
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
  if (!uploaded.ok) {
    return {
      ok: false,
      error:
        uploaded.reason === "tooLarge"
          ? t("publicSiteMediaTooLarge")
          : uploaded.reason === "type" || uploaded.reason === "kind"
            ? t("publicSiteMediaType")
            : t("publicSiteMediaFailed"),
    };
  }
  try {
    const { createMediaAsset } = await import("@/services/media-library");
    const asset = await createMediaAsset({ url: uploaded.url, album, roomTypeId });
    refreshAfterChange(tenantId);
    return { ok: true, value: asset };
  } catch {
    return { ok: false, error: t("mediaSaveFailed") };
  }
}

export async function updateMediaAction(
  id: string,
  patch: { album?: string; roomTypeId?: string | null; alt?: MediaText; focalX?: number; focalY?: number },
): Promise<Result> {
  const g = await guard();
  if (!("tenantId" in g) || !g.tenantId) return { ok: false, error: g.error! };
  const { t, tenantId } = g;
  if (!UUID.test(id)) return { ok: false, error: t("mediaInvalid") };
  if (patch.album !== undefined && !isMediaAlbum(patch.album)) return { ok: false, error: t("mediaInvalid") };
  const roomTypeId = patch.roomTypeId === undefined ? undefined : roomTypeOrNull(patch.roomTypeId);
  if (roomTypeId === "invalid") return { ok: false, error: t("mediaInvalid") };
  const inUnit = (n: number | undefined) => n === undefined || (Number.isFinite(n) && n >= 0 && n <= 1);
  if (!inUnit(patch.focalX) || !inUnit(patch.focalY)) return { ok: false, error: t("mediaInvalid") };
  let alt: MediaText | undefined;
  if (patch.alt) {
    alt = {};
    for (const locale of ["ro", "en", "bg"] as const) {
      const value = patch.alt[locale];
      if (typeof value === "string" && value.trim()) alt[locale] = value.trim().slice(0, 300);
    }
  }
  try {
    const { updateMediaAsset } = await import("@/services/media-library");
    await updateMediaAsset(id, {
      album: patch.album as never,
      roomTypeId,
      alt,
      focalX: patch.focalX,
      focalY: patch.focalY,
    });
    refreshAfterChange(tenantId);
    return { ok: true };
  } catch {
    return { ok: false, error: t("mediaSaveFailed") };
  }
}

export async function reorderMediaAction(ids: string[]): Promise<Result> {
  const g = await guard();
  if (!("tenantId" in g) || !g.tenantId) return { ok: false, error: g.error! };
  const { t, tenantId } = g;
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every((id) => typeof id === "string" && UUID.test(id))) {
    return { ok: false, error: t("mediaInvalid") };
  }
  try {
    const { reorderMediaAssets } = await import("@/services/media-library");
    await reorderMediaAssets(ids);
    refreshAfterChange(tenantId);
    return { ok: true };
  } catch {
    return { ok: false, error: t("mediaSaveFailed") };
  }
}

export async function deleteMediaAction(id: string): Promise<Result> {
  const g = await guard();
  if (!("tenantId" in g) || !g.tenantId) return { ok: false, error: g.error! };
  const { t, tenantId } = g;
  if (!UUID.test(id)) return { ok: false, error: t("mediaInvalid") };
  try {
    const { deleteMediaAsset } = await import("@/services/media-library");
    await deleteMediaAsset(id);
    refreshAfterChange(tenantId);
    return { ok: true };
  } catch {
    return { ok: false, error: t("mediaSaveFailed") };
  }
}
