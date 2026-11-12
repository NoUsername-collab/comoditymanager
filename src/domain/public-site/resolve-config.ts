import { resolveContactWithPrimary } from "@/domain/settings/pension-identity";
import type { PensionContact } from "@/domain/settings/pension-identity";
import type {
  PublicPlace,
  PublicSiteConfig,
  PublicSiteSection,
  PublicSiteSettingsInput,
  PublicSiteSettingsRow,
  PublicStayOffer,
  PublicMediaPhoto,
  PublicSitePage,
  PublicSiteSectionInput,
} from "@/features/public-site/domain/types";
import { emptyPublicPlace } from "@/features/public-site/domain/stay-offers";

export type PublicSiteConfigContext = {
  displayName: string;
  checkInTime: string;
  checkOutTime: string;
  primaryContact: PensionContact;
  fallbackSections: PublicSiteSection[];
  fallbackContactEmail?: string | null;
  stayOffers?: PublicStayOffer[];
  place?: PublicPlace;
  media?: PublicMediaPhoto[];
  /** The site's own pages with their sections. */
  sitePages?: PublicSitePage[];
  /**
   * Identity logo. `undefined` keeps a previously stored chrome logo
   * (identity could not be loaded). `null` means the owner has no logo.
   */
  logoUrl?: string | null;
};

/** Same merge rules as the live public site loader — contact, identity, sections. */
export function finalizePublicSiteConfig(
  settings: PublicSiteSettingsRow,
  sections: PublicSiteSection[],
  ctx: PublicSiteConfigContext,
): PublicSiteConfig {
  const resolvedContact = resolveContactWithPrimary(
    ctx.primaryContact,
    settings.contact,
    settings.usePrimaryContact,
  );

  const logoUrl =
    ctx.logoUrl !== undefined
      ? ctx.logoUrl?.trim() || null
      : settings.chrome.logoUrl?.trim() || null;

  return {
    ...settings,
    chrome: {
      ...settings.chrome,
      logoUrl,
    },
    displayName: ctx.displayName,
    checkInTime: ctx.checkInTime,
    checkOutTime: ctx.checkOutTime,
    sections: sections.length > 0 ? sections : ctx.fallbackSections,
    contact: {
      email: resolvedContact.email ?? ctx.fallbackContactEmail ?? null,
      phone: resolvedContact.phone,
      whatsapp: resolvedContact.whatsapp,
      telegram: resolvedContact.telegram,
      facebook: resolvedContact.facebook,
      instagram: resolvedContact.instagram,
    },
    stayOffers: ctx.stayOffers ?? [],
    place: ctx.place ?? emptyPublicPlace(),
    media: ctx.media ?? [],
    sitePages: ctx.sitePages ?? [],
  };
}

/** Sections as the editor sends them, with an id each (the saved one, else one made from position). */
function withIds(
  sections: PublicSiteSectionInput[],
  saved: PublicSiteSection[],
  prefix: string,
): PublicSiteSection[] {
  return sections.map((section, index) => ({
    ...section,
    id:
      section.id ??
      saved.find((row) => row.sectionType === section.sectionType)?.id ??
      `${prefix}${section.sectionType}-${index}`,
  })) as PublicSiteSection[];
}

/** Build a visitor-facing config from admin draft input (preview pane). */
export function buildPublicSiteConfigFromInput(
  base: PublicSiteConfig,
  input: PublicSiteSettingsInput,
  primaryContact: PensionContact,
): PublicSiteConfig {
  const sections = withIds(input.sections, base.sections, "");
  const sitePages: PublicSitePage[] = (input.sitePages ?? []).map((page) => ({
    ...page,
    sections: withIds(
      page.sections,
      base.sitePages.find((row) => row.id === page.id)?.sections ?? [],
      `${page.id}-`,
    ),
  }));

  return finalizePublicSiteConfig(
    {
      ...base,
      templateId: input.templateId,
      themeId: input.themeId,
      published: input.published,
      bookingEnabled: input.bookingEnabled,
      bookingNavPosition: input.bookingNavPosition,
      usePrimaryContact: input.usePrimaryContact,
      hero: input.hero,
      contact: input.contact,
      seo: input.seo,
      bookingNotice: input.bookingNotice,
      chrome: input.chrome,
      pages: input.pages,
      untranslatedCopy: input.untranslatedCopy,
    },
    sections,
    {
      displayName: base.displayName,
      checkInTime: base.checkInTime,
      checkOutTime: base.checkOutTime,
      primaryContact,
      fallbackSections: base.sections,
      fallbackContactEmail: base.contact.email,
      stayOffers: base.stayOffers,
      place: base.place,
      media: base.media,
      sitePages,
      logoUrl: base.chrome.logoUrl ?? null,
    },
  );
}
