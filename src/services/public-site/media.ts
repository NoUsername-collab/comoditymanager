import {
  PUBLIC_SITE_MEDIA_BUCKET,
  PUBLIC_SITE_MEDIA_MAX_BYTES,
  isPublicSiteTenantId,
  publicSiteObjectPath,
  validatePublicSiteUpload,
  type PublicSiteMediaKind,
} from "@/domain/public-site/media";
import { createPublicAdminClient } from "@/lib/supabase/admin";

export type PublicSiteMediaUploadError =
  | "kind"
  | "empty"
  | "tooLarge"
  | "type"
  | "tenant"
  | "storage";

export type PublicSiteMediaUploadResult =
  | { ok: true; url: string; path: string }
  | { ok: false; reason: PublicSiteMediaUploadError };

async function ensurePublicSiteMediaBucket(
  supabase: ReturnType<typeof createPublicAdminClient>,
): Promise<void> {
  await supabase.storage
    .createBucket(PUBLIC_SITE_MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: PUBLIC_SITE_MEDIA_MAX_BYTES,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    })
    .catch(() => {});
}

export async function uploadPublicSiteImage(args: {
  tenantId: string;
  kind: string;
  bytes: Uint8Array;
}): Promise<PublicSiteMediaUploadResult> {
  if (!isPublicSiteTenantId(args.tenantId)) {
    return { ok: false, reason: "tenant" };
  }

  const validated = validatePublicSiteUpload({
    kind: args.kind,
    bytes: args.bytes,
  });
  if (!validated.ok) {
    return { ok: false, reason: validated.reason };
  }

  const supabase = createPublicAdminClient();
  await ensurePublicSiteMediaBucket(supabase);

  const fileId = crypto.randomUUID();
  const path = publicSiteObjectPath(
    args.tenantId,
    validated.kind,
    fileId,
    validated.ext,
  );

  const { error } = await supabase.storage
    .from(PUBLIC_SITE_MEDIA_BUCKET)
    .upload(path, args.bytes, {
      contentType: validated.mime,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    return { ok: false, reason: "storage" };
  }

  const { data } = supabase.storage
    .from(PUBLIC_SITE_MEDIA_BUCKET)
    .getPublicUrl(path);

  return { ok: true, url: data.publicUrl, path };
}

export type { PublicSiteMediaKind };
