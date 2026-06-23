import { resolveContactWithPrimary } from "@/domain/settings/pension-identity";
import type { PensionContact } from "@/domain/settings/pension-identity";
import type {
  PublicSiteConfig,
  PublicSiteSection,
  PublicSiteSettingsInput,
  PublicSiteSettingsRow,
} from "@/features/public-site/domain/types";

export type PublicSiteConfigContext = {
  displayName: string;
  checkInTime: string;
  checkOutTime: string;
  primaryContact: PensionContact;
  fallbackSections: PublicSiteSection[];
  fallbackContactEmail?: string | null;
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

  return {
    ...settings,
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
  };
}

/** Build a visitor-facing config from admin draft input (preview pane). */
export function buildPublicSiteConfigFromInput(
  base: PublicSiteConfig,
  input: PublicSiteSettingsInput,
  primaryContact: PensionContact,
): PublicSiteConfig {
  const sections: PublicSiteSection[] = input.sections.map((section, index) => ({
    ...section,
    id:
      base.sections.find((row) => row.sectionType === section.sectionType)?.id ??
      `${section.sectionType}-${index}`,
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
    },
    sections,
    {
      displayName: base.displayName,
      checkInTime: base.checkInTime,
      checkOutTime: base.checkOutTime,
      primaryContact,
      fallbackSections: base.sections,
      fallbackContactEmail: base.contact.email,
    },
  );
}
