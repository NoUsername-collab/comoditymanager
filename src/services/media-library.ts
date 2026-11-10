import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getTenantScope } from "@/lib/tenant/scope";
import { PUBLIC_SITE_MEDIA_BUCKET } from "@/domain/public-site/media";
import {
  mediaFromRow,
  photosByRoomType,
  type MediaAlbum,
  type MediaAsset,
  type MediaText,
} from "@/domain/media/types";

const COLUMNS = "id, url, album, room_type_id, alt, focal_x, focal_y, sort_order";

async function listForTenantUncached(tenantId: string): Promise<MediaAsset[]> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select(COLUMNS)
    .eq("tenant_id", tenantId)
    .order("album")
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mediaFromRow(row as Record<string, unknown>));
}

const cachedForTenant = (tenantId: string) =>
  unstable_cache(() => listForTenantUncached(tenantId), ["media-assets", tenantId], {
    tags: [CACHE_TAGS.media, tenantTag(tenantId, CACHE_TAGS.media)],
    revalidate: 300,
  });

/** Every photo of a property, for its public pages and the guest app (tenant passed in). */
export const listMediaForTenant = cache((tenantId: string) => cachedForTenant(tenantId)());

/** The photos of each room type, for the site, the booking form and the guest app. */
export async function roomTypePhotosForTenant(tenantId: string): Promise<Map<string, MediaAsset[]>> {
  return photosByRoomType(await listMediaForTenant(tenantId));
}

/** The library as staff see it in the settings, read fresh. */
export async function listMediaAssets(): Promise<MediaAsset[]> {
  const { tenantId } = await getTenantScope();
  return listForTenantUncached(tenantId);
}

/** A room type id the browser sends must be one of this property's. */
async function assertRoomTypeOfTenant(
  supabase: Awaited<ReturnType<typeof getTenantScope>>["supabase"],
  tenantId: string,
  roomTypeId: string | null | undefined,
): Promise<void> {
  if (!roomTypeId) return;
  const { data } = await supabase
    .from("room_type_definitions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", roomTypeId)
    .maybeSingle();
  if (!data) throw new Error("media.room_type_unknown");
}

export async function createMediaAsset(input: {
  url: string;
  album: MediaAlbum;
  roomTypeId: string | null;
}): Promise<MediaAsset> {
  const { tenantId, supabase } = await getTenantScope();
  await assertRoomTypeOfTenant(supabase, tenantId, input.roomTypeId);
  // New photos go to the end of their album, or of their room type's photos.
  let last = supabase
    .from("media_assets")
    .select("sort_order")
    .eq("tenant_id", tenantId)
    .eq("album", input.album)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (input.roomTypeId) last = last.eq("room_type_id", input.roomTypeId);
  const { data: tail } = await last;
  const next = ((tail?.[0]?.sort_order as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      tenant_id: tenantId,
      url: input.url,
      album: input.album,
      room_type_id: input.roomTypeId,
      sort_order: next,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mediaFromRow(data as Record<string, unknown>);
}

export async function updateMediaAsset(
  id: string,
  patch: {
    album?: MediaAlbum;
    roomTypeId?: string | null;
    alt?: MediaText;
    focalX?: number;
    focalY?: number;
  },
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  await assertRoomTypeOfTenant(supabase, tenantId, patch.roomTypeId);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.album) row.album = patch.album;
  if (patch.roomTypeId !== undefined) row.room_type_id = patch.roomTypeId;
  if (patch.alt) row.alt = patch.alt;
  if (patch.focalX !== undefined) row.focal_x = patch.focalX;
  if (patch.focalY !== undefined) row.focal_y = patch.focalY;
  const { error } = await supabase.from("media_assets").update(row).eq("tenant_id", tenantId).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Put photos in the given order (the ids of one album or one room type). */
export async function reorderMediaAssets(ids: string[]): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from("media_assets").update({ sort_order: index }).eq("tenant_id", tenantId).eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}

/**
 * Remove a photo from the library. Its file is deleted too when it was uploaded
 * into the library (or moved in from the rooms section) and no other photo
 * row points at it; files uploaded elsewhere on the site stay.
 */
export async function deleteMediaAsset(id: string): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("media_assets")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("url")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const url = typeof data?.url === "string" ? data.url : null;
  if (!url) return;

  const marker = `/storage/v1/object/public/${PUBLIC_SITE_MEDIA_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at < 0) return;
  const path = url.slice(at + marker.length);
  const [owner, kind] = path.split("/");
  if (owner !== tenantId || (kind !== "library" && kind !== "room")) return;

  const { count } = await supabase
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("url", url);
  if ((count ?? 0) > 0) return;
  await createPublicAdminClient().storage.from(PUBLIC_SITE_MEDIA_BUCKET).remove([path]);
}
