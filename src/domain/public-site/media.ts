export const PUBLIC_SITE_MEDIA_BUCKET = "public-site-media";
export const PUBLIC_SITE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export const PUBLIC_SITE_MEDIA_KINDS = ["hero", "gallery"] as const;
export type PublicSiteMediaKind = (typeof PUBLIC_SITE_MEDIA_KINDS)[number];

export const PUBLIC_SITE_MEDIA_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type PublicSiteMediaMime = keyof typeof PUBLIC_SITE_MEDIA_MIME;

export type PublicSiteMediaReject = "kind" | "empty" | "tooLarge" | "type";

const JPEG = [0xff, 0xd8, 0xff] as const;
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

export function detectPublicSiteImage(
  bytes: Uint8Array,
): { mime: PublicSiteMediaMime; ext: (typeof PUBLIC_SITE_MEDIA_MIME)[PublicSiteMediaMime] } | null {
  if (startsWith(bytes, JPEG)) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (startsWith(bytes, PNG)) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export function isPublicSiteMediaKind(value: string): value is PublicSiteMediaKind {
  return (PUBLIC_SITE_MEDIA_KINDS as readonly string[]).includes(value);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPublicSiteTenantId(value: string): boolean {
  return UUID_RE.test(value);
}

export function publicSiteObjectPath(
  tenantId: string,
  kind: PublicSiteMediaKind,
  fileId: string,
  ext: string,
): string {
  if (!isPublicSiteTenantId(tenantId) || !UUID_RE.test(fileId)) {
    throw new Error("public-site-media.path");
  }
  if (!isPublicSiteMediaKind(kind)) {
    throw new Error("public-site-media.kind");
  }
  if (!Object.values(PUBLIC_SITE_MEDIA_MIME).includes(ext as "jpg" | "png" | "webp")) {
    throw new Error("public-site-media.ext");
  }
  return `${tenantId}/${kind}/${fileId}.${ext}`;
}

export function validatePublicSiteUpload(args: {
  kind: string;
  bytes: Uint8Array;
}):
  | {
      ok: true;
      kind: PublicSiteMediaKind;
      mime: PublicSiteMediaMime;
      ext: (typeof PUBLIC_SITE_MEDIA_MIME)[PublicSiteMediaMime];
    }
  | { ok: false; reason: PublicSiteMediaReject } {
  if (!isPublicSiteMediaKind(args.kind)) {
    return { ok: false, reason: "kind" };
  }
  if (args.bytes.byteLength === 0) {
    return { ok: false, reason: "empty" };
  }
  if (args.bytes.byteLength > PUBLIC_SITE_MEDIA_MAX_BYTES) {
    return { ok: false, reason: "tooLarge" };
  }
  const detected = detectPublicSiteImage(args.bytes);
  if (!detected) {
    return { ok: false, reason: "type" };
  }
  return { ok: true, kind: args.kind, mime: detected.mime, ext: detected.ext };
}
