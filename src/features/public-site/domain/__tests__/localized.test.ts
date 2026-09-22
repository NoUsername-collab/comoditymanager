import { describe, expect, it } from "vitest";
import {
  pickLocalized,
  pickOwnLocalized,
  writeLocalized,
  writeLocalizedMap,
} from "@/features/public-site/domain/localized";
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

describe("pickOwnLocalized", () => {
  it("does not copy fallback text into an empty locale field", () => {
    expect(pickOwnLocalized({ ro: "Salut", en: "Hello" }, "bg")).toBe("");
  });
});

describe("writeLocalizedMap", () => {
  it("writes every supplied locale and leaves omitted keys alone", () => {
    const next = writeLocalizedMap(
      { ro: "Casa", en: "House" },
      { en: "Home", bg: "Kashta" },
    );
    expect(next).toEqual({ ro: "Casa", en: "Home", bg: "Kashta" });
  });
});

describe("normalizeBenefitIcon", () => {
  it("keeps catalog ids and maps legacy emoji", () => {
    expect(normalizeBenefitIcon("bed")).toBe("bed");
    expect(normalizeBenefitIcon("🛏")).toBe("bed");
    expect(normalizeBenefitIcon("unknown")).toBe("spark");
  });
});
