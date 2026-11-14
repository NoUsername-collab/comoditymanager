import type { ComponentType } from "react";
import type { PublicSectionType } from "@/features/public-site/domain/types";
import type { SectionEditorProps } from "@/features/public-site/editor/ui/section-editing";
import { AmenitiesEditor } from "@/features/public-site/sections/amenities/Editor";
import { AttractionsEditor } from "@/features/public-site/sections/attractions/Editor";
import { BenefitsEditor } from "@/features/public-site/sections/benefits/Editor";
import { CtaEditor } from "@/features/public-site/sections/cta/Editor";
import { FaqEditor } from "@/features/public-site/sections/faq/Editor";
import { GalleryEditor } from "@/features/public-site/sections/gallery/Editor";
import { IntroEditor } from "@/features/public-site/sections/intro/Editor";
import { PlaceEditor } from "@/features/public-site/sections/place/Editor";
import { ReviewsEditor } from "@/features/public-site/sections/reviews/Editor";
import { StaysEditor } from "@/features/public-site/sections/stays/Editor";
import { StepsEditor } from "@/features/public-site/sections/steps/Editor";
import { TextEditor } from "@/features/public-site/sections/text/Editor";
import { VideoEditor } from "@/features/public-site/sections/video/Editor";

/** The editor for each kind of section; used only by the admin's site editor. */
const SECTION_EDITORS: Record<PublicSectionType, ComponentType<SectionEditorProps>> = {
  intro: IntroEditor,
  benefits: BenefitsEditor,
  gallery: GalleryEditor,
  steps: StepsEditor,
  text: TextEditor,
  reviews: ReviewsEditor,
  faq: FaqEditor,
  amenities: AmenitiesEditor,
  attractions: AttractionsEditor,
  video: VideoEditor,
  stays: StaysEditor,
  place: PlaceEditor,
  cta: CtaEditor,
};

export function sectionEditor(type: PublicSectionType): ComponentType<SectionEditorProps> {
  return SECTION_EDITORS[type];
}
