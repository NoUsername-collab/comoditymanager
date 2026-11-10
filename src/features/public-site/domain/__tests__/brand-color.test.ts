import { describe, expect, it } from "vitest";
import {
  brandColorFadesOn,
  contrastRatio,
  normalizeBrandColor,
  readableTextOn,
} from "@/features/public-site/domain/brand-color";
import { normalizePublicChrome, publicChromeFontStack, PUBLIC_FONT_OPTIONS } from "@/features/public-site/domain/chrome";
import { resolvePublicSiteStyle } from "@/features/public-site/themes/loader";

describe("brand colour", () => {
  it("reads the usual ways of writing a colour and nothing else", () => {
    expect(normalizeBrandColor("#B45309")).toBe("#b45309");
    expect(normalizeBrandColor("b45309")).toBe("#b45309");
    expect(normalizeBrandColor(" #abc ")).toBe("#aabbcc");
    expect(normalizeBrandColor("red")).toBeNull();
    expect(normalizeBrandColor("#12345")).toBeNull();
    expect(normalizeBrandColor("url(x)")).toBeNull();
    expect(normalizeBrandColor(null)).toBeNull();
  });

  it("measures contrast as WCAG does", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("puts white text on dark colours and dark text on light ones", () => {
    expect(readableTextOn("#1d4ed8")).toBe("#ffffff");
    expect(readableTextOn("#fde047")).toBe("#111111");
  });

  it("warns when the colour fades on the page", () => {
    expect(brandColorFadesOn("#fde047", "#ffffff")).toBe(true);
    expect(brandColorFadesOn("#1d4ed8", "#ffffff")).toBe(false);
    expect(brandColorFadesOn("#1e293b", "#07060a")).toBe(true);
  });
});

describe("site style", () => {
  it("lays the colour over the palette, with readable text on buttons", () => {
    const style = resolvePublicSiteStyle("noir", { accentColor: "#1d4ed8" }) as Record<string, string>;
    expect(style["--pub-accent"]).toBe("#1d4ed8");
    expect(style["--pub-accent-fg"]).toBe("#ffffff");
    expect(style["--site-accent"]).toBe("#1d4ed8");
    // Too dark to read as text on Noir's near-black page: links keep the palette's.
    expect(style["--pub-link"]).not.toBe("#1d4ed8");
  });

  it("keeps the palette when there is no colour of one's own", () => {
    const plain = resolvePublicSiteStyle("noir", {}) as Record<string, string>;
    const junk = resolvePublicSiteStyle("noir", { accentColor: "javascript:x" }) as Record<string, string>;
    expect(junk["--pub-accent"]).toBe(plain["--pub-accent"]);
  });

  it("lets each layout suggest a heading font, and the operator's pick win", () => {
    const font = (fontId: "theme" | "lora", layout: "classic" | "editorial" | "immersive") =>
      (resolvePublicSiteStyle("noir", { fontId }, layout) as Record<string, string>)["--pub-font-display"];
    const palette = (resolvePublicSiteStyle("noir", {}) as Record<string, string>)["--pub-font-display"];
    expect(font("theme", "classic")).toBe(palette);
    expect(font("theme", "editorial")).toContain("--font-pub-playfair");
    expect(font("theme", "immersive")).toContain("--font-pub-cormorant");
    expect(font("lora", "editorial")).toContain("--font-pub-lora");
  });

  it("sets the heading font from the chosen one", () => {
    const style = resolvePublicSiteStyle("noir", { fontId: "lora" }) as Record<string, string>;
    expect(style["--pub-font-display"]).toContain("--font-pub-lora");
    expect(publicChromeFontStack("theme")).toBeNull();
  });
});

describe("stored chrome", () => {
  it("keeps known fonts and a valid colour, and drops the rest", () => {
    expect(PUBLIC_FONT_OPTIONS).toContain("playfair");
    expect(normalizePublicChrome({ fontId: "montserrat", accentColor: "#ABCDEF" })).toMatchObject({
      fontId: "montserrat",
      accentColor: "#abcdef",
    });
    expect(normalizePublicChrome({ fontId: "comic", accentColor: "blue" })).toMatchObject({
      fontId: "theme",
      accentColor: null,
    });
  });
});
