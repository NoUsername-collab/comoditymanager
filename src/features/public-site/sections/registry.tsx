import type { ReactNode } from "react";
import type {
  PublicSectionType,
  PublicSiteSection,
  PublicSiteSectionOf,
} from "@/features/public-site/domain/types";
import { renderBenefits } from "@/features/public-site/sections/benefits/render";
import { renderCta } from "@/features/public-site/sections/cta/render";
import { renderGallery } from "@/features/public-site/sections/gallery/render";
import { renderIntro } from "@/features/public-site/sections/intro/render";
import { renderSteps } from "@/features/public-site/sections/steps/render";
import { renderText } from "@/features/public-site/sections/text/render";
import { renderPlace } from "@/features/public-site/sections/place/render";
import { renderStays } from "@/features/public-site/sections/stays/render";
import type { SectionRenderContext } from "@/features/public-site/sections/render-context";
import { renderAmenities } from "@/features/public-site/sections/amenities/render";
import { renderAttractions } from "@/features/public-site/sections/attractions/render";
import { renderFaq } from "@/features/public-site/sections/faq/render";
import { renderReviews } from "@/features/public-site/sections/reviews/render";
import { renderVideo } from "@/features/public-site/sections/video/render";

/*
 * How each kind of section is shown on the public site. The editors live in
 * editor-registry.tsx: the site's pages import only this file, so a guest's
 * browser never downloads the editing code.
 */

type Renderer<T extends PublicSectionType> = (
  section: PublicSiteSectionOf<T>,
  ctx: SectionRenderContext,
) => ReactNode;

const SECTION_RENDERERS: { [T in PublicSectionType]: Renderer<T> } = {
  intro: (s, ctx) => renderIntro(s, ctx.locale, ctx.template),
  benefits: (s, ctx) => renderBenefits(s, ctx.locale, ctx.template),
  gallery: (s, ctx) => renderGallery(s, ctx),
  steps: (s, ctx) => renderSteps(s, ctx.locale, ctx.template),
  text: (s, ctx) => renderText(s, ctx.locale),
  reviews: (s, ctx) => renderReviews(s, ctx.locale),
  faq: (s, ctx) => renderFaq(s, ctx.locale),
  amenities: (s, ctx) => renderAmenities(s, ctx.locale),
  attractions: (s, ctx) => renderAttractions(s, ctx.locale),
  video: (s, ctx) => renderVideo(s, ctx.locale),
  stays: renderStays,
  place: renderPlace,
  cta: (s, ctx) => renderCta(s, ctx.locale),
};

/** A section's markup, or null when it is hidden or has nothing to show. */
export function renderPublicSection(
  section: PublicSiteSection,
  ctx: SectionRenderContext,
): ReactNode {
  if (!section.visible) return null;
  const render = SECTION_RENDERERS[section.sectionType] as (
    s: PublicSiteSection,
    c: SectionRenderContext,
  ) => ReactNode;
  return render(section, ctx);
}
