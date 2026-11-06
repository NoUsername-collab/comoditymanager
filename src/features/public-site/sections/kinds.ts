import type { PublicSectionType } from "@/features/public-site/domain/types";
import type { SectionKind } from "@/features/public-site/sections/kind";
import { benefitsKind } from "@/features/public-site/sections/benefits/kind";
import { ctaKind } from "@/features/public-site/sections/cta/kind";
import { galleryKind } from "@/features/public-site/sections/gallery/kind";
import { introKind } from "@/features/public-site/sections/intro/kind";
import { stepsKind } from "@/features/public-site/sections/steps/kind";
import { textKind } from "@/features/public-site/sections/text/kind";

/** Every kind of homepage section, by type. The editor and the save read from here. */
export const SECTION_KINDS: Record<PublicSectionType, SectionKind> = {
  intro: introKind,
  benefits: benefitsKind,
  gallery: galleryKind,
  steps: stepsKind,
  cta: ctaKind,
  text: textKind,
};

export function sectionKind(type: PublicSectionType): SectionKind {
  return SECTION_KINDS[type];
}
