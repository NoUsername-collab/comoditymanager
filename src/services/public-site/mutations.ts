import type { PublicSiteSettingsInputParsed } from "@/domain/settings/schemas/public-site";
import { getTenantScope } from "@/lib/tenant/scope";
import { isPublicSiteMigrationMissing } from "./map";

export async function upsertPublicSiteSettingsImpl(
  tenantId: string,
  input: PublicSiteSettingsInputParsed,
): Promise<void> {
  const { supabase } = await getTenantScope();

  const sectionsPayload = input.sections.map((section, index) => ({
    section_type: section.sectionType,
    sort_order: section.sortOrder ?? index * 10,
    visible: section.visible,
    payload: section.payload,
  }));

  const { error } = await supabase.rpc("upsert_public_site_settings_atomic", {
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
    p_sections: sectionsPayload,
  });

  if (error) {
    if (isPublicSiteMigrationMissing(error.message)) {
      throw new Error("public_site.migration_missing");
    }
    throw new Error(error.message);
  }
}
