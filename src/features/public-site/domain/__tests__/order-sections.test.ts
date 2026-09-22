import { describe, expect, it } from "vitest";
import {
  applyTemplateSectionKeys,
  assignTemplateSectionSort,
  orderPublicSections,
  PUBLIC_TEMPLATE_SECTION_ORDER,
} from "@/features/public-site/domain/order-sections";
import type { PublicSiteSection } from "@/features/public-site/domain/types";

function section(
  id: string,
  sectionType: PublicSiteSection["sectionType"],
  sortOrder: number,
): PublicSiteSection {
  return { id, sectionType, sortOrder, visible: true, payload: {} };
}

const mixed: PublicSiteSection[] = [
  section("intro", "intro", 10),
  section("benefits", "benefits", 20),
  section("gallery", "gallery", 30),
  section("cta", "cta", 40),
];

describe("orderPublicSections", () => {
  it("keeps three templates on different first sections", () => {
    expect(PUBLIC_TEMPLATE_SECTION_ORDER.classic[0]).toBe("intro");
    expect(PUBLIC_TEMPLATE_SECTION_ORDER.editorial[0]).toBe("intro");
    expect(PUBLIC_TEMPLATE_SECTION_ORDER.immersive[0]).toBe("gallery");
    expect(PUBLIC_TEMPLATE_SECTION_ORDER.editorial[1]).toBe("gallery");
    expect(PUBLIC_TEMPLATE_SECTION_ORDER.classic[1]).toBe("benefits");
  });

  it("reads the operator-saved sortOrder", () => {
    const custom = [
      section("gallery", "gallery", 0),
      section("intro", "intro", 10),
      section("benefits", "benefits", 20),
    ];
    expect(orderPublicSections(custom).map((s) => s.id)).toEqual([
      "gallery",
      "intro",
      "benefits",
    ]);
  });

  it("classic layout seed is intro → benefits → gallery", () => {
    expect(assignTemplateSectionSort(mixed, "classic").map((s) => s.id)).toEqual([
      "intro",
      "benefits",
      "gallery",
      "cta",
    ]);
  });

  it("editorial layout seed is intro → gallery → benefits", () => {
    expect(assignTemplateSectionSort(mixed, "editorial").map((s) => s.id)).toEqual([
      "intro",
      "gallery",
      "benefits",
      "cta",
    ]);
  });

  it("immersive layout seed is gallery first, then intro", () => {
    expect(assignTemplateSectionSort(mixed, "immersive").map((s) => s.id)).toEqual([
      "gallery",
      "intro",
      "benefits",
      "cta",
    ]);
  });

  it("keeps leftover text sections after known types in a layout seed", () => {
    const withText = [...mixed, section("note", "text", 15)];
    expect(assignTemplateSectionSort(withText, "classic").map((s) => s.id)).toEqual([
      "intro",
      "benefits",
      "gallery",
      "note",
      "cta",
    ]);
  });

  it("moves gallery first when switching to immersive keys", () => {
    expect(
      applyTemplateSectionKeys(["intro", "benefits", "gallery", "cta"], "immersive"),
    ).toEqual(["gallery", "intro", "benefits", "cta"]);
  });
});
