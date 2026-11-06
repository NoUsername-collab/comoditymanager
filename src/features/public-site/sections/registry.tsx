import type { ComponentType, ReactNode } from "react";
import type {
  PublicSectionType,
  PublicSiteSection,
  PublicSiteSectionOf,
  PublicTemplateId,
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

type Renderer<T extends PublicSectionType> = (
  section: PublicSiteSectionOf<T>,
  locale: string,
  template: PublicTemplateId,
) => ReactNode;

/** What the page and the editor show for each kind of section. */
type SectionView<T extends PublicSectionType> = {
  render: Renderer<T>;
  Editor: ComponentType<SectionEditorProps>;
};

const SECTION_VIEWS: { [T in PublicSectionType]: SectionView<T> } = {
  intro: { render: renderIntro, Editor: IntroEditor },
  benefits: { render: renderBenefits, Editor: BenefitsEditor },
  gallery: { render: renderGallery, Editor: GalleryEditor },
  steps: { render: renderSteps, Editor: StepsEditor },
  text: { render: renderText, Editor: TextEditor },
  cta: { render: renderCta, Editor: CtaEditor },
};

/** The editor for a kind of section. */
export function sectionEditor(type: PublicSectionType): ComponentType<SectionEditorProps> {
  return SECTION_VIEWS[type].Editor;
}

/** A section's markup, or null when it is hidden or has nothing to show. */
export function renderPublicSection(
  section: PublicSiteSection,
  locale: string,
  template: PublicTemplateId,
): ReactNode {
  if (!section.visible) return null;
  const render = SECTION_VIEWS[section.sectionType].render as Renderer<typeof section.sectionType>;
  return (render as (s: PublicSiteSection, l: string, t: PublicTemplateId) => ReactNode)(
    section,
    locale,
    template,
  );
}
