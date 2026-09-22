import { describe, expect, it } from "vitest";
import {
  detectPublicSiteImage,
  publicSiteObjectPath,
  validatePublicSiteUpload,
} from "@/domain/public-site/media";

function jpegHeader(size = 32): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  return bytes;
}

function pngHeader(size = 32): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return bytes;
}

function webpHeader(size = 32): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  return bytes;
}

describe("detectPublicSiteImage", () => {
  it("reads jpeg, png and webp magic bytes", () => {
    expect(detectPublicSiteImage(jpegHeader())?.mime).toBe("image/jpeg");
    expect(detectPublicSiteImage(pngHeader())?.mime).toBe("image/png");
    expect(detectPublicSiteImage(webpHeader())?.mime).toBe("image/webp");
    expect(detectPublicSiteImage(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
  });
});

describe("validatePublicSiteUpload", () => {
  it("rejects empty, oversized, wrong kind and non-image bytes", () => {
    expect(validatePublicSiteUpload({ kind: "hero", bytes: new Uint8Array() }).ok).toBe(false);
    expect(
      validatePublicSiteUpload({ kind: "logo", bytes: jpegHeader() }).ok,
    ).toBe(false);
    expect(
      validatePublicSiteUpload({ kind: "gallery", bytes: new Uint8Array([1, 2, 3, 4]) }).ok,
    ).toBe(false);
    const huge = jpegHeader(5 * 1024 * 1024 + 1);
    expect(validatePublicSiteUpload({ kind: "hero", bytes: huge }).ok).toBe(false);
  });

  it("accepts a jpeg hero under the size cap", () => {
    const result = validatePublicSiteUpload({ kind: "hero", bytes: jpegHeader() });
    expect(result).toEqual({
      ok: true,
      kind: "hero",
      mime: "image/jpeg",
      ext: "jpg",
    });
  });
});

describe("publicSiteObjectPath", () => {
  it("scopes files under tenant and kind", () => {
    expect(
      publicSiteObjectPath(
        "11111111-1111-4111-8111-111111111111",
        "gallery",
        "22222222-2222-4222-8222-222222222222",
        "webp",
      ),
    ).toBe(
      "11111111-1111-4111-8111-111111111111/gallery/22222222-2222-4222-8222-222222222222.webp",
    );
  });

  it("rejects path traversal inputs", () => {
    expect(() =>
      publicSiteObjectPath("../x", "hero", "22222222-2222-4222-8222-222222222222", "jpg"),
    ).toThrow();
  });
});
