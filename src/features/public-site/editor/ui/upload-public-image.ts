import type { PublicSiteMediaKind } from "@/domain/public-site/media";
import { PUBLIC_SITE_MEDIA_MAX_BYTES } from "@/domain/public-site/media";
import { uploadPublicSiteImageAction } from "@/features/settings/actions/public-site";

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Upload one image for the public site; too-large files are refused before
 * they leave the browser. Used by single photo fields and the gallery alike.
 */
export async function uploadPublicImage(
  file: File,
  kind: PublicSiteMediaKind,
  tooLargeMessage: string,
): Promise<UploadResult> {
  if (file.size > PUBLIC_SITE_MEDIA_MAX_BYTES) return { ok: false, error: tooLargeMessage };
  const body = new FormData();
  body.set("kind", kind);
  body.set("file", file);
  return uploadPublicSiteImageAction(body);
}

/** Image types the upload accepts, for file inputs and dropped files. */
export const PUBLIC_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export function isAcceptedImage(file: File): boolean {
  return PUBLIC_IMAGE_ACCEPT.split(",").includes(file.type);
}
