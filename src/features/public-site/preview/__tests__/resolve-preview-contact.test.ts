import { describe, expect, it } from "vitest";
import { resolvePreviewContact } from "@/features/public-site/preview/resolve-preview-contact";

describe("resolvePreviewContact", () => {
  const primary = {
    email: "primary@hotel.ro",
    phone: "+40 700 000 000",
    whatsapp: null,
    telegram: null,
    facebook: null,
    instagram: null,
  };

  it("merges primary contact when usePrimaryContact is true", () => {
    expect(
      resolvePreviewContact(
        primary,
        { email: null, phone: null },
        true,
      ),
    ).toEqual({
      email: "primary@hotel.ro",
      phone: "+40 700 000 000",
      whatsapp: null,
      telegram: null,
      facebook: null,
      instagram: null,
    });
  });

  it("prefers override fields when usePrimaryContact is true", () => {
    expect(
      resolvePreviewContact(
        primary,
        { email: "public@hotel.ro", phone: null },
        true,
      ),
    ).toMatchObject({
      email: "public@hotel.ro",
      phone: "+40 700 000 000",
    });
  });

  it("uses only override when usePrimaryContact is false", () => {
    expect(
      resolvePreviewContact(
        primary,
        { email: "public@hotel.ro", phone: "+40 711" },
        false,
      ),
    ).toEqual({
      email: "public@hotel.ro",
      phone: "+40 711",
      whatsapp: null,
      telegram: null,
      facebook: null,
      instagram: null,
    });
  });
});
