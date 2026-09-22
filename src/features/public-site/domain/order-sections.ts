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
  classic: ["intro", "benefits", "gallery", "steps", "text", "cta"],
  editorial: ["intro", "gallery", "benefits", "steps", "text", "cta"],
  immersive: ["gallery", "intro", "benefits", "steps", "text", "cta"],
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

/** Studio keys (`intro`, `text:id`, …) follow a layout’s default rhythm. */
export function applyTemplateSectionKeys(
  current: string[],
  templateId: PublicTemplateId,
): string[] {
  const preferred = PUBLIC_TEMPLATE_SECTION_ORDER[templateId];
  const texts = current.filter((key) => key.startsWith("text:"));
  const present = new Set(current);
  const result: string[] = [];

  for (const type of preferred) {
    if (type === "text") {
      result.push(...texts);
      continue;
    }
    if (present.has(type)) result.push(type);
  }
  for (const key of current) {
    if (!result.includes(key)) result.push(key);
  }
  return result;
}
