import type { ComponentType, ReactNode } from "react";
import type {
  PublicSectionType,
  PublicSiteSection,
  PublicSiteSectionOf,
} from "@/features/public-site/domain/types";
import type { SectionEditorProps } from "@/features/public-site/editor/ui/section-editing";
import { BenefitsEditor } from "@/features/public-site/sections/benefits/Editor";
import { renderBenefits } from "@/features/public-site/sections/benefits/render";
import { CtaEditor } from "@/features/public-site/sections/cta/Editor";
import { renderCta } from "@/features/public-site/sections/cta/render";
import { GalleryEditor } from "@/features/public-site/sections/gallery/Editor";
import { renderGallery } from "@/features/public-site/sections/gallery/render";
import { IntroEditor } from "@/features/public-site/sections/intro/Editor";
import { renderIntro } from "@/features/public-site/sections/intro/render";
import { StepsEditor } from "@/features/public-site/sections/steps/Editor";
import { renderSteps } from "@/features/public-site/sections/steps/render";
import { TextEditor } from "@/features/public-site/sections/text/Editor";
import { renderText } from "@/features/public-site/sections/text/render";
import { PlaceEditor } from "@/features/public-site/sections/place/Editor";
import { renderPlace } from "@/features/public-site/sections/place/render";
import { StaysEditor } from "@/features/public-site/sections/stays/Editor";
import { renderStays } from "@/features/public-site/sections/stays/render";
import type { SectionRenderContext } from "@/features/public-site/sections/render-context";
import { AmenitiesEditor } from "@/features/public-site/sections/amenities/Editor";
import { renderAmenities } from "@/features/public-site/sections/amenities/render";
import { AttractionsEditor } from "@/features/public-site/sections/attractions/Editor";
import { renderAttractions } from "@/features/public-site/sections/attractions/render";
import { FaqEditor } from "@/features/public-site/sections/faq/Editor";
import { renderFaq } from "@/features/public-site/sections/faq/render";
import { ReviewsEditor } from "@/features/public-site/sections/reviews/Editor";
import { renderReviews } from "@/features/public-site/sections/reviews/render";
import { VideoEditor } from "@/features/public-site/sections/video/Editor";
import { renderVideo } from "@/features/public-site/sections/video/render";

type Renderer<T extends PublicSectionType> = (
  section: PublicSiteSectionOf<T>,
  ctx: SectionRenderContext,
) => ReactNode;

/** What the page and the editor show for each kind of section. */
type SectionView<T extends PublicSectionType> = {
  render: Renderer<T>;
  Editor: ComponentType<SectionEditorProps>;
};

const SECTION_VIEWS: { [T in PublicSectionType]: SectionView<T> } = {
  intro: { render: (s, ctx) => renderIntro(s, ctx.locale, ctx.template), Editor: IntroEditor },
  benefits: { render: (s, ctx) => renderBenefits(s, ctx.locale, ctx.template), Editor: BenefitsEditor },
  gallery: { render: (s, ctx) => renderGallery(s, ctx.locale, ctx.template), Editor: GalleryEditor },
  steps: { render: (s, ctx) => renderSteps(s, ctx.locale, ctx.template), Editor: StepsEditor },
  text: { render: (s, ctx) => renderText(s, ctx.locale), Editor: TextEditor },
  reviews: { render: (s, ctx) => renderReviews(s, ctx.locale), Editor: ReviewsEditor },
  faq: { render: (s, ctx) => renderFaq(s, ctx.locale), Editor: FaqEditor },
  amenities: { render: (s, ctx) => renderAmenities(s, ctx.locale), Editor: AmenitiesEditor },
  attractions: { render: (s, ctx) => renderAttractions(s, ctx.locale), Editor: AttractionsEditor },
  video: { render: (s, ctx) => renderVideo(s, ctx.locale), Editor: VideoEditor },
  stays: { render: renderStays, Editor: StaysEditor },
  place: { render: renderPlace, Editor: PlaceEditor },
  cta: { render: (s, ctx) => renderCta(s, ctx.locale), Editor: CtaEditor },
};

/** The editor for a kind of section. */
export function sectionEditor(type: PublicSectionType): ComponentType<SectionEditorProps> {
  return SECTION_VIEWS[type].Editor;
}

/** A section's markup, or null when it is hidden or has nothing to show. */
export function renderPublicSection(section: PublicSiteSection, ctx: SectionRenderContext): ReactNode {
  if (!section.visible) return null;
  const render = SECTION_VIEWS[section.sectionType].render as (
    s: PublicSiteSection,
    c: SectionRenderContext,
  ) => ReactNode;
  return render(section, ctx);
}
