import type { PublicSiteSettingsInputParsed } from "@/domain/settings/schemas/public-site";
import { getTenantScope } from "@/lib/tenant/scope";

type AtomicRpcArgs = {
  p_tenant_id: string;
  p_template_id: string;
  p_theme_id: string;
  p_published: boolean;
  p_booking_enabled: boolean;
  p_booking_nav_position: string;
  p_use_primary_contact: boolean;
  p_hero: PublicSiteSettingsInputParsed["hero"];
  p_contact: PublicSiteSettingsInputParsed["contact"];
  p_seo: PublicSiteSettingsInputParsed["seo"];
  p_booking_notice: PublicSiteSettingsInputParsed["bookingNotice"];
  p_chrome: PublicSiteSettingsInputParsed["chrome"];
  p_pages: PublicSiteSettingsInputParsed["pages"];
  p_untranslated_copy: PublicSiteSettingsInputParsed["untranslatedCopy"];
  p_sections: Array<{
    id: string | null;
    section_type: string;
    sort_order: number;
    visible: boolean;
    payload: PublicSiteSettingsInputParsed["sections"][number]["payload"];
  }>;
  p_expected_version: number | null;
};

/** Thrown when the settings changed since the editor loaded them. */
export class PublicSiteVersionConflictError extends Error {
  constructor() {
    super("public_site.version_conflict");
  }
}

/**
 * Saves the whole public site in one transaction. `expectedVersion` is the
 * version the editor loaded (null when nothing was saved yet); returns the new one.
 */
export async function upsertPublicSiteSettingsImpl(
  tenantId: string,
  input: PublicSiteSettingsInputParsed,
  expectedVersion: number | null,
): Promise<number> {
  const { supabase } = await getTenantScope();

  const sectionsPayload = input.sections.map((section, index) => ({
    id: section.id ?? null,
    section_type: section.sectionType,
    sort_order: section.sortOrder ?? index * 10,
    visible: section.visible,
    payload: section.payload,
  }));

  const args: AtomicRpcArgs = {
    p_tenant_id: tenantId,
    p_template_id: input.templateId,
    p_theme_id: input.themeId,
    p_published: input.published,
    p_booking_enabled: input.bookingEnabled,
    p_booking_nav_position: input.bookingNavPosition,
    p_use_primary_contact: input.usePrimaryContact,
    p_hero: input.hero,
    p_contact: input.contact,
    p_seo: input.seo,
    p_booking_notice: input.bookingNotice,
    p_chrome: input.chrome ?? {},
    p_pages: input.pages ?? {},
    p_untranslated_copy: input.untranslatedCopy ?? {},
    p_sections: sectionsPayload,
    p_expected_version: expectedVersion,
  };

  const { data, error } = await supabase.rpc("upsert_public_site_settings_atomic", args);

  if (error) {
    if (error.message.includes("public_site.version_conflict")) {
      throw new PublicSiteVersionConflictError();
    }
    throw new Error(error.message);
  }
  return data as number;
}
