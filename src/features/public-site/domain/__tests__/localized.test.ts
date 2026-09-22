import { describe, expect, it } from "vitest";
import { pickLocalized, writeLocalized } from "@/features/public-site/domain/localized";
import { normalizeBenefitIcon } from "@/features/public-site/domain/benefit-icons";

describe("writeLocalized", () => {
  it("patches only the active locale", () => {
    const next = writeLocalized(
      { ro: "Casa", en: "House", bg: "Kashta" },
      "en",
      "Home",
    );
    expect(next).toEqual({ ro: "Casa", en: "Home", bg: "Kashta" });
  });

  it("does not stamp empty siblings onto missing keys", () => {
    const next = writeLocalized({ ro: "Salut" }, "en", "Hello");
    expect(next).toEqual({ ro: "Salut", en: "Hello" });
    expect(pickLocalized(next, "bg")).toBe("Hello");
  });
});

describe("normalizeBenefitIcon", () => {
  it("keeps catalog ids and maps legacy emoji", () => {
    expect(normalizeBenefitIcon("bed")).toBe("bed");
    expect(normalizeBenefitIcon("🛏")).toBe("bed");
    expect(normalizeBenefitIcon("unknown")).toBe("spark");
  });
});
