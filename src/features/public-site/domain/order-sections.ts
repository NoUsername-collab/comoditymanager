import type {
  PublicSectionType,
  PublicSiteSection,
  PublicTemplateId,
} from "@/features/public-site/domain/types";

/** Per-layout section rhythm. Leftover types keep their relative sortOrder. */
export const PUBLIC_TEMPLATE_SECTION_ORDER: Record<
  PublicTemplateId,
  PublicSectionType[]
> = {
  classic: ["intro", "benefits", "amenities", "gallery", "video", "steps", "reviews", "text", "attractions", "faq", "stays", "place", "cta"],
  editorial: ["intro", "gallery", "video", "benefits", "amenities", "steps", "reviews", "text", "attractions", "faq", "stays", "place", "cta"],
  immersive: ["gallery", "video", "intro", "benefits", "amenities", "steps", "reviews", "text", "attractions", "faq", "stays", "place", "cta"],
};

/** Live and preview order: what the operator saved. */
export function orderPublicSections(sections: PublicSiteSection[]): PublicSiteSection[] {
  return [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Apply a layout’s default rhythm and rewrite sortOrder. */
export function assignTemplateSectionSort(
  sections: PublicSiteSection[],
  templateId: PublicTemplateId,
): PublicSiteSection[] {
  const rank = new Map(
    PUBLIC_TEMPLATE_SECTION_ORDER[templateId].map((type, index) => [type, index]),
  );

  return [...sections]
    .sort((a, b) => {
      const byType =
        (rank.get(a.sectionType) ?? 99) - (rank.get(b.sectionType) ?? 99);
      if (byType !== 0) return byType;
      return a.sortOrder - b.sortOrder;
    })
    .map((section, index) => ({ ...section, sortOrder: index * 10 }));
}

/**
 * The first section of a type, with its payload typed for that type.
 * `visibleOnly` skips sections the operator hid.
 */
export function findSection<T extends PublicSectionType>(
  sections: readonly PublicSiteSection[] | undefined,
  sectionType: T,
  { visibleOnly = false }: { visibleOnly?: boolean } = {},
): Extract<PublicSiteSection, { sectionType: T }> | undefined {
  return sections?.find(
    (section): section is Extract<PublicSiteSection, { sectionType: T }> =>
      section.sectionType === sectionType && (!visibleOnly || section.visible),
  );
}
